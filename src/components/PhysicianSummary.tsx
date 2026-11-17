import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { PhysicianStats } from '../types';
import { HOUSE_PHYSICIAN_DEPARTMENTS } from '../types';
import {
  cashTotal,
  hmoTotal,
  privateTotal,
  walkInTotal,
  type PhysicianDailyEntry,
} from '../lib/physicianDailyEntries';
import { toYmd } from '../lib/admissionFilters';
import DailyEntryModal, { type DailyEntrySavePayload } from './DailyEntryModal';

interface PhysicianSummaryProps {
  /** Stats with daily entries already applied for the selected date range */
  stats: PhysicianStats[];
  goodThreshold: number;
  averageThreshold: number;
  departmentByName?: Record<string, string>;
  onPhysicianClick?: (name: string) => void;
  /** Admin / staff can edit daily entries; doctors are read-only */
  canEdit?: boolean;
  /** Doctors listed in the edit window (roster, without House Physicians) */
  rosterNames?: string[];
  /** Every saved daily entry (all dates) – used to pre-fill the edit window */
  entries?: PhysicianDailyEntry[];
  entriesError?: string | null;
  onSaveDailyEntries?: (payload: DailyEntrySavePayload) => Promise<void>;
  datePreset?: string;
  dateFrom?: string;
  dateTo?: string;
  onDatePreset?: (preset: string) => void;
  onDateFrom?: (v: string) => void;
  onDateTo?: (v: string) => void;
  departmentFilter?: string;
  onDepartmentFilter?: (v: string) => void;
  doctorFilter?: string;
  onDoctorFilter?: (v: string) => void;
  physicianNames?: string[];
}

export default function PhysicianSummary({
  stats,
  goodThreshold,
  averageThreshold,
  onPhysicianClick,
  departmentByName = {},
  canEdit = false,
  rosterNames = [],
  entries = [],
  entriesError = null,
  onSaveDailyEntries,
  datePreset = 'month',
  dateFrom = '',
  dateTo = '',
  onDatePreset,
  onDateFrom,
  onDateTo,
  departmentFilter = 'All',
  onDepartmentFilter,
  doctorFilter = 'All',
  onDoctorFilter,
  physicianNames = [],
}: PhysicianSummaryProps) {
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  const displayStats = useMemo(() => {
    let base = stats;
    if (doctorFilter !== 'All') {
      base = base.filter((s) => s.physician === doctorFilter);
    }
    if (departmentFilter !== 'All' && departmentByName) {
      base = base.filter(
        (s) => (departmentByName[s.physician] || '').trim() === departmentFilter
      );
    }
    const q = doctorSearch.trim().toLowerCase();
    if (q) base = base.filter((s) => s.physician.toLowerCase().includes(q));
    return base;
  }, [stats, doctorSearch, doctorFilter, departmentFilter, departmentByName]);

  const totals = useMemo(() => {
    const t = {
      totalOpd: 0,
      advised: 0,
      actual: 0,
      privateHmo: 0,
      privateCash: 0,
      walkInHmo: 0,
      walkInCash: 0,
      admissions: 0,
    };
    displayStats.forEach((s) => {
      t.totalOpd += s.totalOpdConsults;
      t.advised += s.opdAdvisedAdmission;
      t.actual += s.actualAdmissionsFromOpd;
      t.privateHmo += s.privateHmo;
      t.privateCash += s.privateCash;
      t.walkInHmo += s.walkInHmo;
      t.walkInCash += s.walkInCash;
      t.admissions += s.totalAdmissions;
    });
    return t;
  }, [displayStats]);
  const totalConversion =
    totals.totalOpd > 0 ? Math.round((totals.actual / totals.totalOpd) * 1000) / 10 : 0;

  const avgConversion =
    displayStats.length > 0
      ? Math.round(
          (displayStats.reduce((sum, s) => sum + s.conversionRate, 0) / displayStats.length) *
            10
        ) / 10
      : 0;

  const topPerformer = displayStats[0];

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0">
      <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <h1 className="text-[16px] font-bold text-slate-900 leading-none">
          Monthly Physician Performance
        </h1>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {(['today', 'week', 'month', 'all', 'custom'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onDatePreset?.(p)}
              className={`h-8 px-2.5 text-[11px] font-semibold rounded-md border ${
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
                className="h-8 text-[11px] border border-slate-200 rounded-md px-2.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30"
              />
              <span className="text-[11px] text-slate-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateTo?.(e.target.value)}
                className="h-8 text-[11px] border border-slate-200 rounded-md px-2.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30"
              />
            </>
          )}
          <select
            value={departmentFilter}
            onChange={(e) => onDepartmentFilter?.(e.target.value)}
            className="h-8 text-[11px] border border-slate-200 rounded-md px-2.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 max-w-[140px]"
          >
            <option value="All">All departments</option>
            {Array.from(
              new Set(
                (Object.values(departmentByName || {}).filter(Boolean) as string[]).filter(
                  (d) => !(HOUSE_PHYSICIAN_DEPARTMENTS as readonly string[]).includes(d)
                )
              )
            )
              .sort()
              .map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
          </select>
          <select
            value={doctorFilter}
            onChange={(e) => onDoctorFilter?.(e.target.value)}
            className="h-8 text-[11px] border border-slate-200 rounded-md px-2.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 max-w-[160px]"
          >
            <option value="All">All doctors</option>
            {(physicianNames.length
              ? physicianNames
              : displayStats.map((s) => s.physician)
            ).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={doctorSearch}
            onChange={(e) => setDoctorSearch(e.target.value)}
            placeholder="Search..."
            className="h-8 w-[140px] px-2.5 text-[11px] border border-slate-200 rounded-md bg-white focus:outline-none"
          />
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowEditor(true)}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-md bg-[#1348f3] text-white hover:bg-blue-700"
              title="Enter or correct the daily values for all doctors"
            >
              <Pencil size={12} /> Edit daily entries
            </button>
          )}
        </div>
      </div>

      {entriesError && (
        <div className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
          {entriesError}
        </div>
      )}

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

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-[11.5px]">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-3 py-2 font-semibold text-[10px]">Physician Name</th>
                <th className="px-2 py-2 font-semibold text-[10px] text-right">
                  Total OPD Consults
                </th>
                <th className="px-2 py-2 font-semibold text-[10px] text-right">PRIVATE</th>
                <th className="px-2 py-2 font-semibold text-[10px] text-right">WALK-IN</th>
                <th className="px-2 py-2 font-semibold text-[10px] text-right">HMO</th>
                <th className="px-2 py-2 font-semibold text-[10px] text-right">CASH</th>
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
                  <td colSpan={10} className="px-3 py-10 text-center text-slate-400 text-[12px]">
                    No physician data available
                  </td>
                </tr>
              ) : (
                displayStats.map((s, idx) => (
                  <tr
                    key={s.physician}
                    className={`border-b border-slate-100 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    } hover:bg-blue-50/40 transition-colors`}
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
                    <td
                      className="px-2 py-1.5 text-right tabular-nums text-slate-600"
                      title={
                        s.isManualOpd
                          ? 'Added up from daily entries'
                          : 'Counted from the Admission Log (no daily entries in this period)'
                      }
                    >
                      {s.totalOpdConsults}
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap text-slate-600">
                      <span className="tabular-nums font-semibold">{privateTotal(s)}</span>
                      <span className="ml-1 text-[10px] text-slate-400">
                        ({s.privateHmo} HMO, {s.privateCash} CASH)
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap text-slate-600">
                      <span className="tabular-nums font-semibold">{walkInTotal(s)}</span>
                      <span className="ml-1 text-[10px] text-slate-400">
                        ({s.walkInHmo} HMO, {s.walkInCash} CASH)
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
                      {hmoTotal(s)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
                      {cashTotal(s)}
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
                            style={{ width: `${Math.min(s.conversionRate, 100)}%` }}
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
                ))
              )}
            </tbody>
            {displayStats.length > 0 && (
              <tfoot className="sticky bottom-0 bg-white">
                <tr className="border-t-2 border-slate-200 font-semibold text-slate-800">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-2 py-2 text-right tabular-nums">{totals.totalOpd}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <span className="tabular-nums">
                      {totals.privateHmo + totals.privateCash}
                    </span>
                    <span className="ml-1 text-[10px] font-normal text-slate-400">
                      ({totals.privateHmo} HMO, {totals.privateCash} CASH)
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <span className="tabular-nums">
                      {totals.walkInHmo + totals.walkInCash}
                    </span>
                    <span className="ml-1 text-[10px] font-normal text-slate-400">
                      ({totals.walkInHmo} HMO, {totals.walkInCash} CASH)
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {totals.privateHmo + totals.walkInHmo}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {totals.privateCash + totals.walkInCash}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{totals.advised}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{totals.actual}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{totalConversion}%</td>
                  <td className="px-2 py-2 text-right tabular-nums">{totals.admissions}</td>
                </tr>
              </tfoot>
            )}
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
          <span className="text-slate-400">
            · Daily entries are added up for the selected period; doctors with no entries use the Admission Log count
          </span>
        </div>
      </div>

      {showEditor && canEdit && onSaveDailyEntries && (
        <DailyEntryModal
          initialDate={toYmd(new Date())}
          rosterNames={rosterNames}
          entries={entries}
          onClose={() => setShowEditor(false)}
          onSave={onSaveDailyEntries}
        />
      )}
    </div>
  );
}
