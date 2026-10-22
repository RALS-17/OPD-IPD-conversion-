import type { Admission } from '../types';
import { toYmd } from './admissionFilters';

export type NotificationKind =
  | 'conversion_low'
  | 'physician_low'
  | 'pending_advised'
  | 'new_admission'
  | 'doctor_conversion';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
}

function todayYmd() {
  return toYmd(new Date());
}

function conversionOf(list: Admission[]) {
  const total = list.length;
  const actual = list.filter((a) => a.actuallyAdmitted === 'Yes').length;
  const rate = total > 0 ? Math.round((actual / total) * 1000) / 10 : 0;
  return { total, actual, rate };
}

/**
 * Build live notifications from current admissions + targets.
 * Not stored — recomputed whenever data changes (realtime).
 */
export function buildNotifications(opts: {
  admissions: Admission[];
  targetConversion: number;
  goodThreshold: number;
  isAdmin: boolean;
  isDoctor: boolean;
  physicianName: string | null;
}): AppNotification[] {
  const {
    admissions,
    targetConversion,
    goodThreshold,
    isAdmin,
    isDoctor,
    physicianName,
  } = opts;
  const today = todayYmd();
  const todayList = admissions.filter((a) => a.dateOfAdmission === today);
  const out: AppNotification[] = [];
  const now = new Date().toISOString();

  // --- Admin ---
  if (isAdmin) {
    const { total, rate } = conversionOf(todayList);
    if (total >= 3 && rate < targetConversion) {
      out.push({
        id: `conversion_low_${today}`,
        kind: 'conversion_low',
        title: 'Conversion below target',
        body: `Today’s rate is ${rate}% (target ${targetConversion}%) across ${total} OPD records.`,
        severity: rate < targetConversion * 0.7 ? 'critical' : 'warning',
        createdAt: now,
      });
    }

    // Physicians under good threshold (min 3 consults today)
    const byDoc = new Map<string, Admission[]>();
    todayList.forEach((a) => {
      const n = (a.opdAttendingPhysician || '').trim();
      if (!n) return;
      if (!byDoc.has(n)) byDoc.set(n, []);
      byDoc.get(n)!.push(a);
    });
    Array.from(byDoc.entries()).forEach(([name, list]) => {
      const { total: t, rate: r } = conversionOf(list);
      if (t >= 3 && r < goodThreshold) {
        out.push({
          id: `physician_low_${today}_${name}`,
          kind: 'physician_low',
          title: `${name} below threshold`,
          body: `Today: ${r}% conversion (${t} consults). Good threshold is ${goodThreshold}%.`,
          severity: r < goodThreshold * 0.7 ? 'critical' : 'warning',
          createdAt: now,
        });
      }
    });

    // Pending advised not admitted (open cases)
    const pending = admissions.filter(
      (a) => a.advisedForAdmission === 'Yes' && a.actuallyAdmitted !== 'Yes'
    );
    if (pending.length > 0) {
      out.push({
        id: `pending_advised_${pending.length}`,
        kind: 'pending_advised',
        title: 'Advised but not admitted',
        body: `${pending.length} patient(s) marked advised for admission are still not admitted.`,
        severity: pending.length >= 10 ? 'warning' : 'info',
        createdAt: now,
      });
    }

    // Latest new admissions today (up to 3)
    const latest = [...todayList]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 3);
    latest.forEach((a) => {
      out.push({
        id: `new_${a.id}`,
        kind: 'new_admission',
        title: 'New admission encoded',
        body: `${a.patientName || 'Patient'} · ${a.opdAttendingPhysician || 'No attending'} · ${a.actuallyAdmitted === 'Yes' ? 'Admitted' : 'Not admitted'}`,
        severity: 'info',
        createdAt: a.createdAt || now,
      });
    });
  }

  // --- Doctor ---
  if (isDoctor && physicianName) {
    const mineToday = todayList.filter((a) => a.opdAttendingPhysician === physicianName);
    const { total, rate } = conversionOf(mineToday);
    if (total > 0) {
      out.push({
        id: `doctor_conv_${today}`,
        kind: 'doctor_conversion',
        title: 'Your conversion today',
        body:
          rate >= targetConversion
            ? `You are at ${rate}% (${total} consults) — on track vs target ${targetConversion}%.`
            : `You are at ${rate}% (${total} consults) — below target ${targetConversion}%.`,
        severity: rate >= targetConversion ? 'info' : 'warning',
        createdAt: now,
      });
    }
    const myPending = admissions.filter(
      (a) =>
        a.opdAttendingPhysician === physicianName &&
        a.advisedForAdmission === 'Yes' &&
        a.actuallyAdmitted !== 'Yes'
    );
    if (myPending.length > 0) {
      out.push({
        id: `doctor_pending_${myPending.length}`,
        kind: 'pending_advised',
        title: 'Your pending advised patients',
        body: `${myPending.length} of your patients are advised for admission but not yet admitted.`,
        severity: 'warning',
        createdAt: now,
      });
    }
  }

  // Staff: pending + latest (lighter set)
  if (!isAdmin && !isDoctor) {
    const pending = admissions.filter(
      (a) => a.advisedForAdmission === 'Yes' && a.actuallyAdmitted !== 'Yes'
    );
    if (pending.length > 0) {
      out.push({
        id: `staff_pending_${pending.length}`,
        kind: 'pending_advised',
        title: 'Advised but not admitted',
        body: `${pending.length} open advised cases in the log.`,
        severity: 'info',
        createdAt: now,
      });
    }
  }

  return out.slice(0, 20);
}
