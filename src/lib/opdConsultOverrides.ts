/** Permanent Total OPD Consults per physician — Supabase (shared) + localStorage fallback. */

import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'opd-ipd-manual-opd-consults';

export type OpdConsultOverrides = Record<string, number>;

export function loadOpdConsultOverridesLocal(): OpdConsultOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: OpdConsultOverrides = {};
    Object.entries(parsed).forEach(([name, v]) => {
      const n = typeof v === 'number' ? v : Number(v);
      if (name.trim() && Number.isFinite(n) && n >= 0) {
        out[name.trim()] = Math.floor(n);
      }
    });
    return out;
  } catch {
    return {};
  }
}

export function saveOpdConsultOverridesLocal(map: OpdConsultOverrides): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** Sync init (local cache). Prefer fetchOpdConsultOverrides on app load. */
export function loadOpdConsultOverrides(): OpdConsultOverrides {
  return loadOpdConsultOverridesLocal();
}

/** Load permanent totals (Supabase first, else localStorage). */
export async function fetchOpdConsultOverrides(): Promise<OpdConsultOverrides> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('physician_opd_totals')
        .select('physician_name, total_opd');
      if (error) throw error;
      const map: OpdConsultOverrides = {};
      (data || []).forEach((row) => {
        const name = String(row.physician_name || '').trim();
        const n = Number(row.total_opd);
        if (name && Number.isFinite(n) && n >= 0) map[name] = Math.floor(n);
      });
      saveOpdConsultOverridesLocal(map);
      return map;
    } catch (err) {
      console.error('Failed to load physician_opd_totals', err);
    }
  }
  return loadOpdConsultOverridesLocal();
}

/** Set permanent OPD total for a physician (upsert). Shared across devices via Supabase. */
export async function upsertOpdConsultTotal(
  physician: string,
  totalOpd: number
): Promise<OpdConsultOverrides> {
  const key = physician.trim();
  const value = Math.max(0, Math.floor(totalOpd));
  const local = loadOpdConsultOverridesLocal();
  if (!key) return local;

  local[key] = value;
  saveOpdConsultOverridesLocal(local);

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('physician_opd_totals').upsert(
        {
          physician_name: key,
          total_opd: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'physician_name' }
      );
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save physician_opd_totals', err);
      alert(
        'Could not save OPD total to the database. Run supabase/physician_opd_totals.sql in Supabase SQL Editor, then try again. Value was kept on this browser only for now.'
      );
    }
  }

  const next = { ...local };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('opd-totals-changed', { detail: next }));
  }
  return next;
}

/**
 * When a new admission is encoded for a doctor who already has a permanent total,
 * add +1 so the edited baseline stays correct as new data arrives.
 */
export async function incrementOpdConsultTotalIfSet(
  physician: string
): Promise<OpdConsultOverrides | null> {
  const key = (physician || '').trim();
  if (!key) return null;

  const local = loadOpdConsultOverridesLocal();
  if (Object.prototype.hasOwnProperty.call(local, key)) {
    return upsertOpdConsultTotal(key, local[key] + 1);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('physician_opd_totals')
        .select('total_opd')
        .eq('physician_name', key)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return upsertOpdConsultTotal(key, Number(data.total_opd) + 1);
    } catch {
      return null;
    }
  }

  return null;
}

export interface StatsWithOpd {
  physician: string;
  totalOpdConsults: number;
  opdAdvisedAdmission: number;
  actualAdmissionsFromOpd: number;
  conversionRate: number;
  totalAdmissions: number;
  systemOpdConsults?: number;
  isManualOpd?: boolean;
}

/** Permanent totals replace system-encoded count when present. */
export function applyOpdConsultOverrides<T extends StatsWithOpd>(
  stats: T[],
  overrides: OpdConsultOverrides
): T[] {
  return stats
    .map((s) => {
      const key = s.physician.trim();
      const has = Object.prototype.hasOwnProperty.call(overrides, key);
      if (!has) {
        return { ...s, systemOpdConsults: s.totalOpdConsults, isManualOpd: false };
      }
      const totalOpdConsults = Math.max(0, Math.floor(overrides[key]));
      const conversionRate =
        totalOpdConsults > 0
          ? Math.round((s.actualAdmissionsFromOpd / totalOpdConsults) * 1000) / 10
          : 0;
      return {
        ...s,
        systemOpdConsults: s.totalOpdConsults,
        totalOpdConsults,
        conversionRate,
        isManualOpd: true,
      };
    })
    .sort((a, b) => b.conversionRate - a.conversionRate);
}
