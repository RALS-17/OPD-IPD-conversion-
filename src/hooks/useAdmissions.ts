import { useState, useEffect, useCallback } from 'react';
import type { Admission, PhysicianStats, RankedItem, PatientType } from '../types';
import {
  isSupabaseConfigured,
  fetchAdmissions,
  insertAdmission,
  updateAdmissionRow,
  deleteAdmissionRow,
} from '../lib/admissionsApi';

const STORAGE_KEY = 'globalcare_admissions_v3';

export const SAMPLE_ADMISSIONS: Admission[] = [
  {
    id: '1',
    patientName: 'Juan dela Cruz',
    address: 'Blk 5 Lot 12, Canlubang, Calamba, Laguna',
    oldNew: 'New',
    hhoCash: 'HHO',
    source: 'ER',
    patientType: 'Walk-in',
    chiefComplaint: 'Lagnat, Ubo - 2 Days',
    diagnosis: 'Viral Pneumonia',
    advisedForAdmission: 'Yes',
    opdAttendingPhysician: 'Dr. Maria Santos',
    actuallyAdmitted: 'Yes',
    dateOfAdmission: '2025-05-15',
    timeOfAdmission: '10:24',
    admittingPhysician: 'Dr. Jose Reyes',
    remarks: 'Stable, under observation',
    createdAt: '2025-05-15T10:24:00',
  },
  {
    id: '2',
    patientName: 'Maria Clara Santos',
    address: 'Purok 3, Brgy. Mayapa, Calamba City',
    oldNew: 'Old',
    hhoCash: 'CASH',
    source: 'OPD',
    patientType: 'Private',
    chiefComplaint: 'Sakit sa dibdib - 1 Day',
    diagnosis: 'Unstable Angina',
    advisedForAdmission: 'Yes',
    opdAttendingPhysician: 'Dr. Angelo Cruz',
    actuallyAdmitted: 'Yes',
    dateOfAdmission: '2025-05-15',
    timeOfAdmission: '09:58',
    admittingPhysician: 'Dr. Roberto Villanueva',
    remarks: 'Plan for Angiography',
    createdAt: '2025-05-15T09:58:00',
  },
  {
    id: '3',
    patientName: 'Pedro Magtanggol',
    address: 'Phase 2, Carmelray Industrial Park, Canlubang',
    oldNew: 'New',
    hhoCash: 'HHO',
    source: 'Direct',
    patientType: 'Walk-in',
    chiefComplaint: 'Sakit ng tiyan - 3 Days',
    diagnosis: 'Acute Gastritis',
    advisedForAdmission: 'Yes',
    opdAttendingPhysician: 'Dr. Liza Mendoza',
    actuallyAdmitted: 'Yes',
    dateOfAdmission: '2025-05-15',
    timeOfAdmission: '09:41',
    admittingPhysician: 'Dr. Ana Patricia Gomez',
    remarks: 'IV fluids given',
    createdAt: '2025-05-15T09:41:00',
  },
  {
    id: '4',
    patientName: 'Rosario Bautista',
    address: 'Sitio Maligaya, Brgy. Canlubang, Laguna',
    oldNew: 'Old',
    hhoCash: 'CASH',
    source: 'ER',
    patientType: 'Walk-in',
    chiefComplaint: 'Hirap huminga - 2 Days',
    diagnosis: 'COPD Exacerbation',
    advisedForAdmission: 'Yes',
    opdAttendingPhysician: 'Dr. Maria Santos',
    actuallyAdmitted: 'Yes',
    dateOfAdmission: '2025-05-15',
    timeOfAdmission: '09:15',
    admittingPhysician: 'Dr. Jose Reyes',
    remarks: 'Nebulization started',
    createdAt: '2025-05-15T09:15:00',
  },
  {
    id: '5',
    patientName: 'Carlos Miguel Rivera',
    address: 'Villa de Calamba, Laguna',
    oldNew: 'New',
    hhoCash: 'HHO',
    source: 'OPD',
    patientType: 'Private',
    chiefComplaint: 'Sakit ng ulo, Pagsusuka - 1 Day',
    diagnosis: 'Migraine',
    advisedForAdmission: 'Yes',
    opdAttendingPhysician: 'Dr. Angelo Cruz',
    actuallyAdmitted: 'No',
    dateOfAdmission: '2025-05-15',
    timeOfAdmission: '08:52',
    admittingPhysician: '',
    remarks: 'Awaiting bed availability',
    createdAt: '2025-05-15T08:52:00',
  },
  {
    id: '6',
    patientName: 'Angela Mae Flores',
    address: 'Brgy. Real, Calamba City, Laguna',
    oldNew: 'New',
    hhoCash: 'HHO',
    source: 'OPD',
    patientType: 'Private',
    chiefComplaint: 'Masakit ang likod - 4 Days',
    diagnosis: 'Lumbar Strain',
    advisedForAdmission: 'Yes',
    opdAttendingPhysician: 'Dr. Paolo Enriquez',
    actuallyAdmitted: 'Yes',
    dateOfAdmission: '2025-05-15',
    timeOfAdmission: '08:30',
    admittingPhysician: 'Dr. Jose Reyes',
    remarks: 'For PT referral',
    createdAt: '2025-05-15T08:30:00',
  },
  {
    id: '7',
    patientName: 'Ricardo Torres',
    address: 'Banlic, Calamba, Laguna',
    oldNew: 'Old',
    hhoCash: 'CASH',
    source: 'ER',
    patientType: 'Walk-in',
    chiefComplaint: 'High blood, dizziness',
    diagnosis: 'Hypertensive Urgency',
    advisedForAdmission: 'Yes',
    opdAttendingPhysician: 'Dr. Liza Mendoza',
    actuallyAdmitted: 'Yes',
    dateOfAdmission: '2025-05-15',
    timeOfAdmission: '08:15',
    admittingPhysician: 'Dr. Roberto Villanueva',
    remarks: 'BP monitoring q1h',
    createdAt: '2025-05-15T08:15:00',
  },
  {
    id: '8',
    patientName: 'Sofia Gabriela Lim',
    address: 'Poblacion, Canlubang, Laguna',
    oldNew: 'New',
    hhoCash: 'HHO',
    source: 'Direct',
    patientType: 'Walk-in',
    chiefComplaint: 'Hirap huminga - 1 Day',
    diagnosis: 'Bronchial Asthma',
    advisedForAdmission: 'Yes',
    opdAttendingPhysician: 'Dr. Maria Santos',
    actuallyAdmitted: 'Yes',
    dateOfAdmission: '2025-05-15',
    timeOfAdmission: '08:00',
    admittingPhysician: 'Dr. Ana Patricia Gomez',
    remarks: 'O2 support',
    createdAt: '2025-05-15T08:00:00',
  },
  {
    id: '9',
    patientName: 'Andres Bonifacio Jr.',
    address: 'Brgy. Bubuyan, Calamba, Laguna',
    oldNew: 'New',
    hhoCash: 'HHO',
    source: 'OPD',
    patientType: 'Private',
    chiefComplaint: 'Lagnat, Ubo - 3 Days',
    diagnosis: 'Viral Pneumonia',
    advisedForAdmission: 'Yes',
    opdAttendingPhysician: 'Dr. Maria Santos',
    actuallyAdmitted: 'Yes',
    dateOfAdmission: '2025-05-14',
    timeOfAdmission: '16:20',
    admittingPhysician: 'Dr. Jose Reyes',
    remarks: '',
    createdAt: '2025-05-14T16:20:00',
  },
  {
    id: '10',
    patientName: 'Gabriela Silang',
    address: 'Turbina, Calamba City',
    oldNew: 'Old',
    hhoCash: 'CASH',
    source: 'ER',
    patientType: 'Walk-in',
    chiefComplaint: 'Sakit ng tiyan - 2 Days',
    diagnosis: 'Acute Gastritis',
    advisedForAdmission: 'Yes',
    opdAttendingPhysician: 'Dr. Liza Mendoza',
    actuallyAdmitted: 'Yes',
    dateOfAdmission: '2025-05-14',
    timeOfAdmission: '14:05',
    admittingPhysician: 'Dr. Ana Patricia Gomez',
    remarks: '',
    createdAt: '2025-05-14T14:05:00',
  },
];

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
    actuallyAdmitted: raw.actuallyAdmitted || 'No',
    dateOfAdmission: raw.dateOfAdmission || '',
    timeOfAdmission: time || '00:00',
    admittingPhysician: raw.admittingPhysician || '',
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
          console.error('Supabase load failed, falling back to localStorage', err);
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

  const addAdmission = useCallback(async (data: Omit<Admission, 'id' | 'createdAt'>) => {
    if (isSupabaseConfigured) {
      try {
        const row = await insertAdmission(data);
        setAdmissions((prev) => [normalizeAdmission(row), ...prev]);
        return;
      } catch (err) {
        console.error('Supabase insert failed', err);
        alert('Failed to save to database. Check Supabase connection.');
        return;
      }
    }
    const newAdmission: Admission = {
      ...data,
      patientType: data.patientType || 'Private',
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setAdmissions((prev) => [newAdmission, ...prev]);
  }, []);

  const updateAdmission = useCallback(async (id: string, data: Partial<Admission>) => {
    if (isSupabaseConfigured) {
      try {
        await updateAdmissionRow(id, data);
      } catch (err) {
        console.error('Supabase update failed', err);
        alert('Failed to update in database.');
        return;
      }
    }
    setAdmissions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
    );
  }, []);

  const deleteAdmission = useCallback(async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        await deleteAdmissionRow(id);
      } catch (err) {
        console.error('Supabase delete failed', err);
        alert('Failed to delete from database.');
        return;
      }
    }
    setAdmissions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAllData = useCallback(async () => {
    if (isSupabaseConfigured) {
      alert('Clear all is disabled while using Supabase. Delete rows in Supabase Table Editor if needed.');
      return;
    }
    setAdmissions([]);
  }, []);

  const reloadSampleData = useCallback(() => {
    if (isSupabaseConfigured) {
      alert('Reload sample is for local mode only. Seed data via SQL in Supabase if needed.');
      return;
    }
    setAdmissions(SAMPLE_ADMISSIONS);
  }, []);

  const getLiveKpis = useCallback(() => {
    const totalOpd = admissions.length;
    const advised = admissions.filter((a) => a.advisedForAdmission === 'Yes').length;
    const actual = admissions.filter((a) => a.actuallyAdmitted === 'Yes').length;
    const conversion =
      totalOpd > 0 ? Math.round((actual / totalOpd) * 1000) / 10 : 0;
    return { totalOpd, advised, actual, conversion };
  }, [admissions]);

  const getLivePhysicianStats = useCallback((): PhysicianStats[] => {
    // Conversion rate is based ONLY on OPD Attending Physician (not Admitting Physician)
    const map = new Map<string, PhysicianStats>();

    admissions.forEach((a) => {
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
        });
      }
      const stats = map.get(name)!;
      stats.totalOpdConsults += 1;
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
  }, [admissions]);


  const getLiveMix = useCallback(() => {
    const hmo = admissions.filter((a) => a.hhoCash === 'HHO').length;
    const cash = admissions.filter((a) => a.hhoCash === 'CASH').length;
    const walkIn = admissions.filter((a) => a.patientType === 'Walk-in').length;
    const privateCount = admissions.filter((a) => a.patientType === 'Private').length;
    const payTotal = hmo + cash || 1;
    return {
      hmo,
      cash,
      private: privateCount,
      walkIn,
      hmoPct: Math.round((hmo / payTotal) * 1000) / 10,
      cashPct: Math.round((cash / payTotal) * 1000) / 10,
    };
  }, [admissions]);

  const getKpis = useCallback(() => getLiveKpis(), [getLiveKpis]);

  const getPhysicianStats = useCallback(() => getLivePhysicianStats(), [getLivePhysicianStats]);

  const getMix = useCallback(() => getLiveMix(), [getLiveMix]);

  const getTopDiagnoses = useCallback((): RankedItem[] => rankField(admissions, 'diagnosis', 5), [admissions]);

  const getTopComplaints = useCallback((): RankedItem[] => rankField(admissions, 'chiefComplaint', 5), [admissions]);


  const getMonthlyTrend = useCallback(() => {
    // Group by day of current calendar month from dateOfAdmission
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const byDay: Record<number, { total: number; admitted: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) byDay[d] = { total: 0, admitted: 0 };

    admissions.forEach((a) => {
      if (!a.dateOfAdmission) return;
      const dt = new Date(a.dateOfAdmission + 'T00:00:00');
      if (dt.getFullYear() !== year || dt.getMonth() !== month) return;
      const day = dt.getDate();
      byDay[day].total += 1;
      if (a.actuallyAdmitted === 'Yes') byDay[day].admitted += 1;
    });

    // Points only for days that have data, plus evenly spaced labels
    const points: { day: number; value: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const { total, admitted } = byDay[d];
      if (total > 0) {
        points.push({
          day: d,
          value: Math.round((admitted / total) * 1000) / 10,
        });
      }
    }
    return { daysInMonth, points, year, month: month + 1 };
  }, [admissions]);

  const exportCsv = useCallback(() => {
    const headers = [
      'Patient Name',
      'Address',
      'Old/New',
      'HHO/CASH',
      'Source',
      'Chief Complaint',
      'Diagnosis',
      'Advised',
      'Actually Admitted',
      'Date of Admission',
      'Time of Admission',
      'OPD Attending Physician',
      'Admitting Physician',
      'Remarks',
    ];
    const rows = admissions.map((a) =>
      [
        a.patientName,
        a.address,
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
        a.admittingPhysician,
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
  }, [admissions]);

  return {
    admissions,
    addAdmission,
    updateAdmission,
    deleteAdmission,
    clearAllData,
    reloadSampleData,
    exportCsv,
    getPhysicianStats,
    getKpis,
    getMix,
    getTopDiagnoses,
    getTopComplaints,
    getMonthlyTrend,
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
