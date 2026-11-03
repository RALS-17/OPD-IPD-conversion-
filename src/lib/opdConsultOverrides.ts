/** Manual Total OPD Consults overrides per physician (not all OPD is encoded in the system). */

const STORAGE_KEY = 'opd-ipd-manual-opd-consults';

export type OpdConsultOverrides = Record<string, number>;

export function loadOpdConsultOverrides(): OpdConsultOverrides {
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

export function saveOpdConsultOverrides(map: OpdConsultOverrides): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function setOpdConsultOverride(
  map: OpdConsultOverrides,
  physician: string,
  value: number | null
): OpdConsultOverrides {
  const next = { ...map };
  const key = physician.trim();
  if (!key) return next;
  if (value === null || value === undefined || Number.isNaN(value)) {
    delete next[key];
  } else {
    next[key] = Math.max(0, Math.floor(value));
  }
  saveOpdConsultOverrides(next);
  return next;
}

export interface StatsWithOpd {
  physician: string;
  totalOpdConsults: number;
  opdAdvisedAdmission: number;
  actualAdmissionsFromOpd: number;
  conversionRate: number;
  totalAdmissions: number;
  /** System-encoded count before manual override */
  systemOpdConsults?: number;
  /** True when a manual total is applied */
  isManualOpd?: boolean;
}

/** Apply manual totals and recompute conversion rate. */
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
