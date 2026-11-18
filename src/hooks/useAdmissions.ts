import { useState, useEffect, useCallback, useRef } from 'react';
import type { Admission, PhysicianStats, RankedItem, PatientType } from '../types';
import {
  isSupabaseConfigured,
  fetchAdmissions,
  insertAdmission,
  updateAdmissionRow,
  deleteAdmissionRow,
  fromRow,
} from '../lib/admissionsApi';
import { supabase } from '../lib/supabase';
import { writeAudit } from '../lib/auditLog';
import { toast, errorMessage } from '../lib/toast';
import { rankDiagnoses } from '../lib/diagnosis';

const STORAGE_KEY = 'globalcare_admissions_v3';

function normalizeAdmission(raw: Partial<Admission> & { id: string }): Admission {
  let time = raw.timeOfAdmission || '';
  if (!time && raw.createdAt) {
    const d = new Date(raw.createdAt);
    if (!isNaN(d.getTime())) {
      time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
  let patientType = raw.patientType as PatientType | undefined;
  if (!patientType) {
    patientType = raw.source === 'OPD' ? 'Private' : 'Walk-in';
  }
  return {
    id: raw.id,
    patientName: raw.patientName || '',
    address: raw.address || '',
    oldNew: raw.oldNew || 'New',
    hhoCash: raw.hhoCash || 'HHO',
    source: raw.source || 'OPD',
    patientType,
    chiefComplaint: raw.chiefComplaint || '',
    diagnosis: raw.diagnosis || '',
    advisedForAdmission: raw.advisedForAdmission || 'No',
    opdAttendingPhysician: raw.opdAttendingPhysician || '',
    opdPatientStatus: raw.opdPatientStatus || 'New',
    actuallyAdmitted: raw.actuallyAdmitted || 'No',
    dateOfAdmission: raw.dateOfAdmission || '',
    timeOfAdmission: time || '00:00',
    admittingPhysician: raw.admittingPhysician || '',
    housePhysician: raw.housePhysician || '',
    remarks: raw.remarks || '',
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

function rankField(
  admissions: Admission[],
  field: 'diagnosis' | 'chiefComplaint',
  limit = 5
): RankedItem[] {
  const map = new Map<string, number>();
  admissions.forEach((a) => {
    let key = (a[field] || '').trim();
    if (!key) return;
    if (field === 'chiefComplaint') {
      key = key.replace(/\s*-\s*\d+\s*Days?/i, '').trim();
    }
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function useAdmissions() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const auditActorRef = useRef({ name: '', email: '' });
  const setAuditActor = useCallback((name: string, email: string) => {
    auditActorRef.current = { name, email };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isSupabaseConfigured) {
        try {
          const rows = await fetchAdmissions();
          if (!cancelled) {
            setAdmissions(rows.map((a) => normalizeAdmission(a)));
            setLoaded(true);
          }
          return;
        } catch (err) {
          // Never show another account's cached data: report the failure and show an empty list
          console.error('Supabase load failed', err);
          toast.error(
            `Could not load the admission records. Please refresh the page.\n${errorMessage(err)}`
          );
          if (!cancelled) {
            setAdmissions([]);
            setLoaded(true);
          }
          return;
        }
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<Admission>[];
          if (!cancelled) {
            setAdmissions(parsed.map((a) => normalizeAdmission(a as Admission)));
          }
        } catch {
          if (!cancelled) setAdmissions([]);
        }
      } else {
        const old = localStorage.getItem('globalcare_admissions_v2');
        if (old) {
          try {
            const parsed = JSON.parse(old) as Partial<Admission>[];
            if (!cancelled) {
              setAdmissions(parsed.map((a) => normalizeAdmission(a as Admission)));
            }
          } catch {
            if (!cancelled) setAdmissions([]);
          }
        } else if (!cancelled) {
          setAdmissions([]);
        }
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded && !isSupabaseConfigured) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(admissions));
    }
  }, [admissions, loaded]);

  // Live updates from Supabase (no full page reload)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const channel = client
      .channel('admissions-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admissions' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const row = normalizeAdmission(fromRow(payload.new as Record<string, unknown>));
            setAdmissions((prev) => {
              if (prev.some((a) => a.id === row.id)) return prev;
              return [row, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const row = normalizeAdmission(fromRow(payload.new as Record<string, unknown>));
            setAdmissions((prev) => prev.map((a) => (a.id === row.id ? row : a)));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const id = String((payload.old as { id?: string }).id || '');
            if (id) setAdmissions((prev) => prev.filter((a) => a.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);


  /** Returns true when the record was saved, false when it failed (a toast explains why). */
  const addAdmission = useCallback(
    async (data: Omit<Admission, 'id' | 'createdAt'>): Promise<boolean> => {
      if (isSupabaseConfigured) {
        try {
          const row = await insertAdmission(data);
          // Realtime may already have added this row — never create a duplicate
          setAdmissions((prev) =>
            prev.some((a) => a.id === row.id) ? prev : [normalizeAdmission(row), ...prev]
          );
          void writeAudit({
            action: 'create',
            entityId: row.id,
            summary: `Added admission: ${data.patientName || 'patient'}`,
            actorName: auditActorRef.current.name,
            actorEmail: auditActorRef.current.email,
          });
          toast.success('Admission record saved.');
          return true;
        } catch (err) {
          console.error('Supabase insert failed', err);
          toast.error(
            `Could not save the admission record. Nothing was saved, so please try again.\n${errorMessage(err)}`
          );
          return false;
        }
      }
      const newAdmission: Admission = {
        ...data,
        patientType: data.patientType || 'Private',
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setAdmissions((prev) => [newAdmission, ...prev]);
      void writeAudit({
        action: 'create',
        entityId: newAdmission.id,
        summary: `Added admission: ${data.patientName || 'patient'}`,
        actorName: auditActorRef.current.name,
        actorEmail: auditActorRef.current.email,
      });
      toast.success('Admission record saved.');
      return true;
    },
    []
  );

  const updateAdmission = useCallback(
    async (id: string, data: Partial<Admission>): Promise<boolean> => {
      if (isSupabaseConfigured) {
        try {
          await updateAdmissionRow(id, data);
        } catch (err) {
          console.error('Supabase update failed', err);
          toast.error(
            `Could not update the admission record. Your changes were not saved.\n${errorMessage(err)}`
          );
          return false;
        }
      }
      setAdmissions((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
      void writeAudit({
        action: 'update',
        entityId: id,
        summary: `Updated admission ${id.slice(0, 8)}…`,
        actorName: auditActorRef.current.name,
        actorEmail: auditActorRef.current.email,
      });
      toast.success('Admission record updated.');
      return true;
    },
    []
  );

  const deleteAdmission = useCallback(async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      try {
        await deleteAdmissionRow(id);
      } catch (err) {
        console.error('Supabase delete failed', err);
        toast.error(
          `Could not delete the admission record. It is still in the log.\n${errorMessage(err)}`
        );
        return false;
      }
    }
    setAdmissions((prev) => prev.filter((a) => a.id !== id));
    void writeAudit({
      action: 'delete',
      entityId: id,
      summary: `Deleted admission ${id.slice(0, 8)}…`,
      actorName: auditActorRef.current.name,
      actorEmail: auditActorRef.current.email,
    });
    toast.success('Admission record deleted.');
    return true;
  }, []);

  /** Returns true only when data was actually cleared. */
  const clearAllData = useCallback(async (): Promise<boolean> => {
    if (isSupabaseConfigured) {
      toast.info(
        'Clear all is disabled while using Supabase. Delete rows in the Supabase Table Editor if needed.'
      );
      return false;
    }
    setAdmissions([]);
    return true;
  }, []);

  const computeKpis = useCallback((list: Admission[]) => {
    const totalOpd = list.length;
    const advised = list.filter((a) => a.advisedForAdmission === 'Yes').length;
    const actual = list.filter((a) => a.actuallyAdmitted === 'Yes').length;
    const conversion =
      totalOpd > 0 ? Math.round((actual / totalOpd) * 1000) / 10 : 0;
    return { totalOpd, advised, actual, conversion };
  }, []);

  const getLiveKpis = useCallback(() => computeKpis(admissions), [admissions, computeKpis]);

  const computePhysicianStats = useCallback((list: Admission[]): PhysicianStats[] => {
    // Conversion rate is based ONLY on OPD Attending Physician (not Admitting Physician)
    const map = new Map<string, PhysicianStats>();

    list.forEach((a) => {
      const name = (a.opdAttendingPhysician || '').trim();
      if (!name) return;

      if (!map.has(name)) {
        map.set(name, {
          physician: name,
          totalOpdConsults: 0,
          opdAdvisedAdmission: 0,
          actualAdmissionsFromOpd: 0,
          conversionRate: 0,
          totalAdmissions: 0,
          privateHmo: 0,
          privateCash: 0,
          walkInHmo: 0,
          walkInCash: 0,
        });
      }
      const stats = map.get(name)!;
      stats.totalOpdConsults += 1;
      // Patient mix: Private / Walk-in × HMO / CASH
      const isHmo = a.hhoCash === 'HHO';
      if (a.patientType === 'Walk-in') {
        if (isHmo) stats.walkInHmo += 1;
        else stats.walkInCash += 1;
      } else if (isHmo) stats.privateHmo += 1;
      else stats.privateCash += 1;
      if (a.advisedForAdmission === 'Yes') stats.opdAdvisedAdmission += 1;
      // Count as converted admission under this attending physician
      if (a.actuallyAdmitted === 'Yes') {
        stats.actualAdmissionsFromOpd += 1;
        stats.totalAdmissions += 1;
      }
    });

    return Array.from(map.values())
      .map((s) => ({
        ...s,
        conversionRate:
          s.totalOpdConsults > 0
            ? Math.round((s.actualAdmissionsFromOpd / s.totalOpdConsults) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate);
  }, []);

  const getLivePhysicianStats = useCallback(
    () => computePhysicianStats(admissions),
    [admissions, computePhysicianStats]
  );

  const computeMix = useCallback((list: Admission[]) => {
    const hmo = list.filter((a) => a.hhoCash === 'HHO').length;
    const cash = list.filter((a) => a.hhoCash === 'CASH').length;
    const walkIn = list.filter((a) => a.patientType === 'Walk-in').length;
    const privateCount = list.filter((a) => a.patientType === 'Private').length;
    const oldCount = list.filter((a) => a.oldNew === 'Old').length;
    const newCount = list.filter((a) => a.oldNew === 'New').length;
    const payTotal = hmo + cash || 1;
    const oldNewTotal = oldCount + newCount || 1;
    return {
      hmo,
      cash,
      private: privateCount,
      walkIn,
      old: oldCount,
      new: newCount,
      hmoPct: Math.round((hmo / payTotal) * 1000) / 10,
      cashPct: Math.round((cash / payTotal) * 1000) / 10,
      oldPct: Math.round((oldCount / oldNewTotal) * 1000) / 10,
      newPct: Math.round((newCount / oldNewTotal) * 1000) / 10,
    };
  }, []);

  const getLiveMix = useCallback(() => computeMix(admissions), [admissions, computeMix]);

  const getKpis = useCallback(
    (list?: Admission[]) => (list ? computeKpis(list) : getLiveKpis()),
    [computeKpis, getLiveKpis]
  );

  const getPhysicianStats = useCallback(
    (list?: Admission[]) => (list ? computePhysicianStats(list) : getLivePhysicianStats()),
    [computePhysicianStats, getLivePhysicianStats]
  );

  const getMix = useCallback(
    (list?: Admission[]) => (list ? computeMix(list) : getLiveMix()),
    [computeMix, getLiveMix]
  );

  const getTopDiagnoses = useCallback(
    (list?: Admission[], limit = 10): RankedItem[] =>
      rankDiagnoses(list ?? admissions, { limit }).items.map(({ name, count }) => ({ name, count })),
    [admissions]
  );

  const getTopComplaints = useCallback(
    (list?: Admission[]): RankedItem[] => rankField(list ?? admissions, 'chiefComplaint', 5),
    [admissions]
  );


  /**
   * Daily conversion trend.
   * volumeByDate (YYYY-MM-DD → total OPD consults that day) lets daily entries feed the
   * denominator exactly; without it the denominator is the number of records that day.
   */
  const getMonthlyTrend = useCallback((list?: Admission[], volumeByDate?: Record<string, number>) => {
    const source = list ?? admissions;
    // Prefer month with the most rows in the list; fall back to current calendar month
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-based
    const monthCounts = new Map<string, number>();
    source.forEach((a) => {
      if (!a.dateOfAdmission || a.dateOfAdmission.length < 7) return;
      const key = a.dateOfAdmission.slice(0, 7); // YYYY-MM
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
    });
    if (monthCounts.size > 0) {
      let best = '';
      let bestN = -1;
      monthCounts.forEach((n, k) => {
        if (n > bestN) {
          bestN = n;
          best = k;
        }
      });
      if (best) {
        const [ys, ms] = best.split('-');
        year = Number(ys);
        month = Number(ms) - 1;
      }
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const byDay: Record<number, { total: number; admitted: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) byDay[d] = { total: 0, admitted: 0 };

    source.forEach((a) => {
      if (!a.dateOfAdmission) return;
      const dt = new Date(a.dateOfAdmission + 'T00:00:00');
      if (dt.getFullYear() !== year || dt.getMonth() !== month) return;
      const day = dt.getDate();
      byDay[day].total += 1;
      if (a.actuallyAdmitted === 'Yes') byDay[day].admitted += 1;
    });

    // Plot every day that has already occurred; future days stay off the chart.
    // Days with no admissions show 0% so the line sits on the baseline.
    const isCurrentMonth =
      year === now.getFullYear() && month === now.getMonth();
    const isFutureMonth =
      year > now.getFullYear() ||
      (year === now.getFullYear() && month > now.getMonth());
    const lastDay = isFutureMonth
      ? 0
      : isCurrentMonth
        ? Math.min(now.getDate(), daysInMonth)
        : daysInMonth;

    const points: { day: number; value: number }[] = [];
    const mm = String(month + 1).padStart(2, '0');
    for (let d = 1; d <= lastDay; d++) {
      const { total: recordCount, admitted } = byDay[d];
      const dayKey = `${year}-${mm}-${String(d).padStart(2, '0')}`;
      const total = volumeByDate ? volumeByDate[dayKey] ?? 0 : recordCount;
      // Admitted can never exceed 100% of the day's volume
      const denom = Math.max(total, admitted);
      const raw = denom > 0 ? Math.round((admitted / denom) * 1000) / 10 : 0;
      points.push({
        day: d,
        value: Math.min(100, Math.max(0, raw)),
      });
    }
    return { daysInMonth, points, year, month: month + 1 };
  }, [admissions]);

  const exportCsv = useCallback((list?: Admission[]) => {
    const source = list ?? admissions;
    const headers = [
      'Patient Name',
      'Old/New (Hospital)',
      'HHO/CASH',
      'Source',
      'Chief Complaint',
      'Diagnosis',
      'Advised',
      'Actually Admitted',
      'Date of Admission',
      'Time of Admission',
      'OPD Attending Physician',
      'Old/New to OPD Doctor',
      'Admitting Physician',
      'House Physician',
      'Remarks',
    ];
    const rows = source.map((a) =>
      [
        a.patientName,
        a.oldNew,
        a.hhoCash,
        a.source,
        a.chiefComplaint,
        a.diagnosis,
        a.advisedForAdmission,
        a.actuallyAdmitted,
        a.dateOfAdmission,
        a.timeOfAdmission,
        a.opdAttendingPhysician,
        a.opdPatientStatus,
        a.admittingPhysician,
        a.housePhysician,
        a.remarks,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `globalcare-admissions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    void writeAudit({
      action: 'export',
      summary: `Exported ${source.length} admission row(s) to CSV`,
      actorName: auditActorRef.current.name,
      actorEmail: auditActorRef.current.email,
    });
  }, [admissions]);

  return {
    admissions,
    addAdmission,
    updateAdmission,
    deleteAdmission,
    clearAllData,
    exportCsv,
    getPhysicianStats,
    getKpis,
    getMix,
    getTopDiagnoses,
    getTopComplaints,
    getMonthlyTrend,
    setAuditActor,
    loaded,
    usingSupabase: isSupabaseConfigured,
  };
}

/** Format HH:mm to 12h display e.g. 10:24 → 10:24 AM */
export function formatTime12(time: string): string {
  if (!time) return '—';
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return time;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
