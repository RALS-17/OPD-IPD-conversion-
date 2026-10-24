import type { Admission } from '../types';

export type DatePreset = 'today' | 'week' | 'month' | 'all' | 'custom';

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function rangeForPreset(preset: DatePreset): { from: string; to: string } | null {
  const now = new Date();
  if (preset === 'all') return null;
  if (preset === 'today') {
    const t = toYmd(now);
    return { from: t, to: t };
  }
  if (preset === 'week') {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: toYmd(from), to: toYmd(now) };
  }
  if (preset === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toYmd(from), to: toYmd(now) };
  }
  return null;
}

/** Previous comparable period for “vs last …” labels. */
export function previousRange(
  preset: DatePreset,
  from?: string,
  to?: string
): { from: string; to: string; label: string } | null {
  const now = new Date();
  if (preset === 'all') return null;

  if (preset === 'today') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const t = toYmd(y);
    return { from: t, to: t, label: 'vs yesterday' };
  }

  if (preset === 'week') {
    const end = new Date(now);
    end.setDate(end.getDate() - 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { from: toYmd(start), to: toYmd(end), label: 'vs prior 7 days' };
  }

  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toYmd(start), to: toYmd(end), label: 'vs last month' };
  }

  if (preset === 'custom' && from && to) {
    const fromD = new Date(from + 'T00:00:00');
    const toD = new Date(to + 'T00:00:00');
    if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) return null;
    const days = Math.max(0, Math.round((toD.getTime() - fromD.getTime()) / 86400000));
    const prevTo = new Date(fromD);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - days);
    return {
      from: toYmd(prevFrom),
      to: toYmd(prevTo),
      label: 'vs prior period',
    };
  }

  return null;
}

export function filterByDateRange(
  list: Admission[],
  from?: string | null,
  to?: string | null
): Admission[] {
  if (!from && !to) return list;
  return list.filter((a) => {
    const d = a.dateOfAdmission || '';
    if (!d) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

export function filterByPhysician(list: Admission[], physicianName: string | null | undefined): Admission[] {
  if (!physicianName) return list;
  return list.filter((a) => a.opdAttendingPhysician === physicianName);
}
