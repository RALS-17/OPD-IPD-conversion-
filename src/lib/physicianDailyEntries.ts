/**
 * Daily OPD entries per physician (permanent, dated, shared via Supabase).
 *
 * Each row = one physician on one date:
 *   Total OPD Consults, Private–HMO, Private–CASH, Walk-in–HMO, Walk-in–CASH
 * The Physician Summary / Dashboard add up all entries inside the selected date range.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { PhysicianStats } from '../types';

const LOCAL_KEY = 'opd-ipd-physician-daily-entries';
const PAGE_SIZE = 1000;

export interface EntryValues {
  totalOpd: number;
  privateHmo: number;
  privateCash: number;
  walkInHmo: number;
  walkInCash: number;
}

export interface PhysicianDailyEntry extends EntryValues {
  physician: string;
  /** YYYY-MM-DD */
  date: string;
}

/** One row of a "save day" request. values = null → clear that doctor's entry for the day. */
export interface DailyEntryRowInput {
  physician: string;
  values: EntryValues | null;
}

function toCount(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function fromRow(row: Record<string, unknown>): PhysicianDailyEntry {
  return {
    physician: String(row.physician_name ?? '').trim(),
    date: row.entry_date ? String(row.entry_date).slice(0, 10) : '',
    totalOpd: toCount(row.total_opd),
    privateHmo: toCount(row.private_hmo),
    privateCash: toCount(row.private_cash),
    walkInHmo: toCount(row.walkin_hmo),
    walkInCash: toCount(row.walkin_cash),
  };
}

function toRow(e: PhysicianDailyEntry) {
  return {
    physician_name: e.physician.trim(),
    entry_date: e.date,
    total_opd: toCount(e.totalOpd),
    private_hmo: toCount(e.privateHmo),
    private_cash: toCount(e.privateCash),
    walkin_hmo: toCount(e.walkInHmo),
    walkin_cash: toCount(e.walkInCash),
    updated_at: new Date().toISOString(),
  };
}

function loadLocal(): PhysicianDailyEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((r) => ({
        physician: String(r.physician ?? '').trim(),
        date: String(r.date ?? '').slice(0, 10),
        totalOpd: toCount(r.totalOpd),
        privateHmo: toCount(r.privateHmo),
        privateCash: toCount(r.privateCash),
        walkInHmo: toCount(r.walkInHmo),
        walkInCash: toCount(r.walkInCash),
      }))
      .filter((r) => r.physician && r.date);
  } catch {
    return [];
  }
}

function saveLocal(list: PhysicianDailyEntry[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

/** Load every daily entry (paged, because Supabase returns max 1000 rows per request). */
export async function fetchDailyEntries(): Promise<PhysicianDailyEntry[]> {
  if (!isSupabaseConfigured || !supabase) return loadLocal();

  const all: PhysicianDailyEntry[] = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from('physician_daily_entries')
      .select('*')
      .order('entry_date', { ascending: true })
      .order('physician_name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data || [];
    rows.forEach((r) => all.push(fromRow(r as Record<string, unknown>)));
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all.filter((e) => e.physician && e.date);
}

/**
 * Save one day for many doctors in one go.
 * Rows with values replace that doctor's entry for the date; rows with null clear it.
 * Returns the entries that were upserted and the names that were cleared.
 */
export async function saveDailyEntriesForDate(
  date: string,
  rows: DailyEntryRowInput[]
): Promise<{ upserted: PhysicianDailyEntry[]; cleared: string[] }> {
  const upserted: PhysicianDailyEntry[] = [];
  const cleared: string[] = [];
  rows.forEach((r) => {
    const name = r.physician.trim();
    if (!name) return;
    if (r.values) upserted.push({ physician: name, date, ...r.values });
    else cleared.push(name);
  });

  if (isSupabaseConfigured && supabase) {
    if (upserted.length > 0) {
      const { error } = await supabase
        .from('physician_daily_entries')
        .upsert(upserted.map(toRow), { onConflict: 'physician_name,entry_date' });
      if (error) throw error;
    }
    if (cleared.length > 0) {
      const { error } = await supabase
        .from('physician_daily_entries')
        .delete()
        .eq('entry_date', date)
        .in('physician_name', cleared);
      if (error) throw error;
    }
  } else {
    const touched = new Set([...upserted.map((e) => e.physician), ...cleared]);
    const next = loadLocal().filter((e) => !(e.date === date && touched.has(e.physician)));
    saveLocal([...next, ...upserted]);
  }

  return { upserted, cleared };
}

/* ───────────────────────── aggregation helpers ───────────────────────── */

export function filterEntriesByRange(
  entries: PhysicianDailyEntry[],
  from?: string | null,
  to?: string | null
): PhysicianDailyEntry[] {
  if (!from && !to) return entries;
  return entries.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });
}

/** Add up all entries per physician. */
export function sumEntriesByPhysician(
  entries: PhysicianDailyEntry[]
): Record<string, EntryValues> {
  const out: Record<string, EntryValues> = {};
  entries.forEach((e) => {
    const key = e.physician.trim();
    if (!key) return;
    const cur =
      out[key] ??
      (out[key] = {
        totalOpd: 0,
        privateHmo: 0,
        privateCash: 0,
        walkInHmo: 0,
        walkInCash: 0,
      });
    cur.totalOpd += e.totalOpd;
    cur.privateHmo += e.privateHmo;
    cur.privateCash += e.privateCash;
    cur.walkInHmo += e.walkInHmo;
    cur.walkInCash += e.walkInCash;
  });
  return out;
}

export const privateTotal = (s: Pick<PhysicianStats, 'privateHmo' | 'privateCash'>) =>
  s.privateHmo + s.privateCash;
export const walkInTotal = (s: Pick<PhysicianStats, 'walkInHmo' | 'walkInCash'>) =>
  s.walkInHmo + s.walkInCash;
export const hmoTotal = (s: Pick<PhysicianStats, 'privateHmo' | 'walkInHmo'>) =>
  s.privateHmo + s.walkInHmo;
export const cashTotal = (s: Pick<PhysicianStats, 'privateCash' | 'walkInCash'>) =>
  s.privateCash + s.walkInCash;

function rate(actual: number, total: number): number {
  return total > 0 ? Math.round((actual / total) * 1000) / 10 : 0;
}

/**
 * Merge daily entries (already limited to the selected date range) into the
 * Admission-Log based stats.
 *  - Doctor has entries in the range → Total OPD + patient mix come from the entries.
 *  - Doctor has none → keep the Admission-Log counts.
 *  - Doctor with entries but no admissions → added as an extra row (so new doctors show up).
 */
export function applyDailyEntries(
  stats: PhysicianStats[],
  totals: Record<string, EntryValues>
): PhysicianStats[] {
  const mapped = stats.map((s) => {
    const key = s.physician.trim();
    const t = totals[key];
    if (!t) return { ...s, systemOpdConsults: s.totalOpdConsults, isManualOpd: false };
    return {
      ...s,
      systemOpdConsults: s.totalOpdConsults,
      totalOpdConsults: t.totalOpd,
      privateHmo: t.privateHmo,
      privateCash: t.privateCash,
      walkInHmo: t.walkInHmo,
      walkInCash: t.walkInCash,
      conversionRate: rate(s.actualAdmissionsFromOpd, t.totalOpd),
      isManualOpd: true,
    };
  });

  const present = new Set(mapped.map((s) => s.physician.trim()));
  const extras: PhysicianStats[] = [];
  Object.entries(totals).forEach(([name, t]) => {
    const key = name.trim();
    if (!key || present.has(key)) return;
    extras.push({
      physician: key,
      totalOpdConsults: t.totalOpd,
      opdAdvisedAdmission: 0,
      actualAdmissionsFromOpd: 0,
      conversionRate: 0,
      totalAdmissions: 0,
      privateHmo: t.privateHmo,
      privateCash: t.privateCash,
      walkInHmo: t.walkInHmo,
      walkInCash: t.walkInCash,
      systemOpdConsults: 0,
      isManualOpd: true,
    });
  });

  return [...mapped, ...extras].sort(
    (a, b) => b.conversionRate - a.conversionRate || a.physician.localeCompare(b.physician)
  );
}

export interface EntryDelta {
  total: number;
  hmo: number;
  cash: number;
  private: number;
  walkIn: number;
}

/**
 * How much the daily entries change the Admission-Log numbers.
 * (entry-adjusted stats) minus (record-based stats), per doctor, added up.
 * Doctors without entries contribute 0; doctors only present through entries
 * (e.g. newly added) contribute their full entered numbers.
 */
export function entryDelta(system: PhysicianStats[], adjusted: PhysicianStats[]): EntryDelta {
  const sysByName = new Map(system.map((s) => [s.physician.trim(), s]));
  const d: EntryDelta = { total: 0, hmo: 0, cash: 0, private: 0, walkIn: 0 };
  adjusted.forEach((a) => {
    if (!a.isManualOpd) return;
    const s = sysByName.get(a.physician.trim());
    d.total += a.totalOpdConsults - (s?.totalOpdConsults ?? 0);
    d.hmo += hmoTotal(a) - (s ? hmoTotal(s) : 0);
    d.cash += cashTotal(a) - (s ? cashTotal(s) : 0);
    d.private += privateTotal(a) - (s ? privateTotal(s) : 0);
    d.walkIn += walkInTotal(a) - (s ? walkInTotal(s) : 0);
  });
  return d;
}

/**
 * Total OPD volume per day (YYYY-MM-DD → consults) using the SAME rules as applyDailyEntries:
 *  - a doctor who has daily entries in the range → their volume is the entered Total OPD per day
 *  - every other record (doctors without entries, records with no OPD doctor) → one consult per record
 * `entries` must already be limited to the range / filters being shown.
 * Pass applyEntries=false (e.g. ER-only view) to count records only.
 */
export function buildVolumeByDate(
  admissions: { dateOfAdmission: string; opdAttendingPhysician: string }[],
  entries: PhysicianDailyEntry[],
  applyEntries: boolean
): Record<string, number> {
  const manual = new Set<string>();
  if (applyEntries) entries.forEach((e) => manual.add(e.physician.trim()));

  const out: Record<string, number> = {};
  admissions.forEach((a) => {
    if (!a.dateOfAdmission) return;
    if (manual.has((a.opdAttendingPhysician || '').trim())) return; // replaced by entries
    out[a.dateOfAdmission] = (out[a.dateOfAdmission] || 0) + 1;
  });
  if (applyEntries) {
    entries.forEach((e) => {
      if (!e.date) return;
      out[e.date] = (out[e.date] || 0) + e.totalOpd;
    });
  }
  return out;
}
