import type { PhysicianStats } from '../types';

interface PhysicianSummaryProps {
  stats: PhysicianStats[];
  goodThreshold: number;
  averageThreshold: number;
}

export default function PhysicianSummary({
  stats,
  goodThreshold,
  averageThreshold,
}: PhysicianSummaryProps) {
  const avgConversion =
    stats.length > 0
      ? Math.round(
          (stats.reduce((sum, s) => sum + s.conversionRate, 0) / stats.length) * 10
        ) / 10
      : 0;

  const topPerformer = stats[0];

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0">
      {/* Header - compact */}
      <div className="shrink-0">
        <h1 className="text-[16px] font-bold text-slate-900 leading-none">
          Monthly Physician Performance
        </h1>
        <p className="text-slate-500 text-[11.5px] mt-0.5">
          Track OPD conversion performance and admission outcomes.
        </p>
      </div>

      {/* Summary cards - compact */}
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
            Across {stats.length} physicians
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

      {/* Table - compact */}
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
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-400 text-[12px]">
                    No physician data available
                  </td>
                </tr>
              ) : (
                stats.map((s) => (
                  <tr
                    key={s.physician}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-700 shrink-0">
                          {s.physician
                            .replace('Dr. ', '')
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <span className="font-medium text-slate-800">{s.physician}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-600">
                      {s.totalOpdConsults}
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend - compact */}
        <div className="px-3 py-1.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[10px] text-slate-500 shrink-0">
          <span className="font-semibold text-slate-600">Conversion Rate:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {`≥ ${goodThreshold}% Good`}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {`${averageThreshold}–${goodThreshold}% Average`}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            {`< ${averageThreshold}% Needs Improvement`}
          </span>
        </div>
      </div>

      {/* Formula note - compact */}
      <div className="bg-blue-50/80 border border-blue-100 rounded-md px-3 py-2 shrink-0">
        <p className="text-[11px] text-slate-700">
          <span className="font-semibold text-[#1348f3]">Conversion Rate Formula:</span>{' '}
          (Actual OPD Admissions ÷ Total OPD Consultations) × 100
        </p>
      </div>
    </div>
  );
}
