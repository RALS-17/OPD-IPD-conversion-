import { useMemo, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import type { PhysicianStats } from '../types';
import {
  applyOpdConsultOverrides,
  loadOpdConsultOverrides,
  upsertOpdConsultTotal,
  type OpdConsultOverrides,
} from '../lib/opdConsultOverrides';
interface PhysicianSummaryProps {
  stats: PhysicianStats[];
  goodThreshold: number;
  averageThreshold: number;
  departmentByName?: Record<string, string>;
  onPhysicianClick?: (name: string) => void;
  /** When overrides change (so Dashboard can stay in sync if needed) */
  onOpdOverridesChange?: (map: OpdConsultOverrides) => void;
  /** Controlled overrides from parent; if omitted, loads from localStorage */
  opdOverrides?: OpdConsultOverrides;
  datePreset?: string;
  dateFrom?: string;
  dateTo?: string;
  onDatePreset?: (preset: string) => void;
  onDateFrom?: (v: string) => void;
  onDateTo?: (v: string) => void;
}

export default function PhysicianSummary({
  stats,
  goodThreshold,
  averageThreshold,
  onPhysicianClick,
  onOpdOverridesChange,
  opdOverrides: controlledOverrides,
  datePreset = 'month',
  dateFrom = '',
  dateTo = '',
  onDatePreset,
  onDateFrom,
  onDateTo,
}: PhysicianSummaryProps) {
  const [localOverrides, setLocalOverrides] = useState<OpdConsultOverrides>(() =>
    loadOpdConsultOverrides()
  );
  const overrides = controlledOverrides ?? localOverrides;

  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');

  const displayStats = useMemo(() => {
    const base = applyOpdConsultOverrides(stats, overrides);
    const q = doctorSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((s) => s.physician.toLowerCase().includes(q));
  }, [stats, overrides, doctorSearch]);

  const avgConversion =
    displayStats.length > 0
      ? Math.round(
          (displayStats.reduce((sum, s) => sum + s.conversionRate, 0) / displayStats.length) *
            10
        ) / 10
      : 0;

  const topPerformer = displayStats[0];

  const commitOverrides = (next: OpdConsultOverrides) => {
    if (controlledOverrides === undefined) setLocalOverrides(next);
    onOpdOverridesChange?.(next);
  };

  const startEdit = (physician: string, current: number) => {
    setEditing(physician);
    setEditValue(String(current));
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue('');
  };

  const saveEdit = async (physician: string) => {
    const n = Number(editValue);
    if (!Number.isFinite(n) || n < 0) {
      cancelEdit();
      return;
    }
    // Permanent total for this doctor (shared via Supabase when configured)
    const next = await upsertOpdConsultTotal(physician, n);
    commitOverrides(next);
    cancelEdit();
  };

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0">
      <div className="shrink-0">
        <h1 className="text-[16px] font-bold text-slate-900 leading-none">
          Monthly Physician Performance
        </h1>
        <p className="text-slate-500 text-[11.5px] mt-0.5">
          Track OPD conversion performance and admission outcomes.
        </p>
      </div>

      <div className="shrink-0 flex flex-wrap items-center gap-1.5 justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['today', 'week', 'month', 'all', 'custom'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onDatePreset?.(p)}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md border ${
                datePreset === p
                  ? 'bg-[#1348f3] text-white border-[#1348f3]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p === 'today'
                ? 'Today'
                : p === 'week'
                  ? '7 days'
                  : p === 'month'
                    ? 'This month'
                    : p === 'all'
                      ? 'All'
                      : 'Custom'}
            </button>
          ))}
          {datePreset === 'custom' && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFrom?.(e.target.value)}
                className="text-[10px] border border-slate-200 rounded-md px-1.5 py-1"
              />
              <span className="text-[10px] text-slate-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateTo?.(e.target.value)}
                className="text-[10px] border border-slate-200 rounded-md px-1.5 py-1"
              />
            </>
          )}
        </div>
        <input
          type="text"
          value={doctorSearch}
          onChange={(e) => setDoctorSearch(e.target.value)}
          placeholder="Search doctor…"
          className="text-[11px] border border-slate-200 rounded-md px-2 py-1 bg-white min-w-[180px] focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 shrink-0">
        <div className="bg-white rounded-md border border-slate-200 shadow-sm px-3 py-2.5">
          <p className="text-[11px] font-medium text-slate-500">Average Conversion Rate</p>
          <p className="text-[22px] font-bold text-slate-900 leading-tight mt-0.5">
            {avgConversion}%
          </p>
          <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1348f3] to-blue-400 rounded-full"
              style={{ width: `${Math.min(avgConversion, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Across {displayStats.length} physicians
          </p>
        </div>

        <div className="bg-white rounded-md border border-slate-200 shadow-sm px-3 py-2.5">
          <p className="text-[11px] font-medium text-slate-500">Top Performer</p>
          {topPerformer ? (
            <div className="flex items-center gap-2.5 mt-1">
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-[12px] font-bold text-[#1348f3] shrink-0">
                {topPerformer.physician
                  .replace('Dr. ', '')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-900 leading-tight truncate">
                  {topPerformer.physician}
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold leading-tight">
                  {topPerformer.conversionRate}% Conversion Rate
                </p>
                <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9.5px] font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                  ⭐ Top Performer
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-[12px] mt-2">No data yet</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-[11.5px]">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-3 py-2 font-semibold text-[10px]">Physician Name</th>
                <th className="px-2 py-2 font-semibold text-[10px] text-right">
                  Total OPD Consults
                </th>
                <th className="px-2 py-2 font-semibold text-[10px] text-right">
                  OPD Advised Admission
                </th>
                <th className="px-2 py-2 font-semibold text-[10px] text-right">
                  Actual Admissions from OPD
                </th>
                <th className="px-2 py-2 font-semibold text-[10px] text-right">
                  Conversion Rate (%)
                </th>
                <th className="px-2 py-2 font-semibold text-[10px] text-right">
                  Total Admissions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-400 text-[12px]">
                    No physician data available
                  </td>
                </tr>
              ) : (
                displayStats.map((s) => {
                  const isEditing = editing === s.physician;
                  return (
                    <tr
                      key={s.physician}
                      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => onPhysicianClick?.(s.physician)}
                          className="flex items-center gap-1.5 text-left group"
                          title="View physician details"
                        >
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-700 shrink-0">
                            {s.physician
                              .replace('Dr. ', '')
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <span className="font-medium text-slate-800 group-hover:text-[#1348f3] group-hover:underline">
                            {s.physician}
                          </span>
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center justify-end gap-0.5">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(s.physician);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="w-16 text-right text-[11px] border border-[#1348f3] rounded px-1 py-0.5 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveEdit(s.physician)}
                              className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Save"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1">
                            <span className="tabular-nums text-slate-600">
                              {s.totalOpdConsults}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEdit(s.physician, s.totalOpdConsults)}
                              className="p-0.5 text-slate-400 hover:text-[#1348f3] hover:bg-blue-50 rounded"
                              title="Edit Total OPD Consults"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right text-slate-600">
                        {s.opdAdvisedAdmission}
                      </td>
                      <td className="px-2 py-1.5 text-right text-slate-600">
                        {s.actualAdmissionsFromOpd}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                s.conversionRate >= goodThreshold
                                  ? 'bg-emerald-500'
                                  : s.conversionRate >= averageThreshold
                                    ? 'bg-amber-400'
                                    : 'bg-red-400'
                              }`}
                              style={{
                                width: `${Math.min(s.conversionRate, 100)}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`font-semibold min-w-[40px] text-right ${
                              s.conversionRate >= goodThreshold
                                ? 'text-emerald-600'
                                : s.conversionRate >= averageThreshold
                                  ? 'text-amber-600'
                                  : 'text-red-500'
                            }`}
                          >
                            {s.conversionRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right text-slate-600">
                        {s.totalAdmissions}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-3 py-1.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[10px] text-slate-500 shrink-0">
          <span className="font-semibold text-slate-600">Conversion Rate:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {`≥ ${goodThreshold}% Good`}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {`${averageThreshold}–${goodThreshold - 0.1}% Average`}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            {`< ${averageThreshold}% Needs Improvement`}
          </span>
          <span className="text-slate-400">· Pencil = edit Total OPD Consults</span>
        </div>
      </div>
    </div>
  );
}
