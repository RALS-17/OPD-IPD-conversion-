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
