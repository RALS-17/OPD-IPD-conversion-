import {
  Users,
  ClipboardCheck,
  BedDouble,
  TrendingUp,
  ArrowUpRight,
  Calendar,
  Shield,
  Wallet,
  UserRound,
  Footprints,
} from 'lucide-react';
import type { PhysicianStats, RankedItem } from '../types';

interface MixStats {
  hmo: number;
  cash: number;
  private: number;
  walkIn: number;
  hmoPct: number;
  cashPct: number;
}

interface MonthlyTrend {
  daysInMonth: number;
  points: { day: number; value: number }[];
  year: number;
  month: number;
}

interface DashboardProps {
  kpis: {
    totalOpd: number;
    advised: number;
    actual: number;
    conversion: number;
  };
  mix: MixStats;
  physicianStats: PhysicianStats[];
  departmentByName?: Record<string, string>;
  topDiagnoses: RankedItem[];
  topComplaints: RankedItem[];
  monthlyTrend: MonthlyTrend;
  targetConversion: number;
  goodThreshold: number;
  averageThreshold: number;
}

export default function Dashboard({
  kpis,
  mix,
  physicianStats,
  departmentByName = {},
  topDiagnoses,
  topComplaints,
  monthlyTrend,
  targetConversion,
  goodThreshold,
  averageThreshold,
}: DashboardProps) {
  const topPhysicians = physicianStats.slice(0, 5);

  // Chart geometry (single SVG so line + dots share coordinates)
  const chartW = 400;
  const chartH = 180;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const maxY = 50;
  const daysInMonth = monthlyTrend.daysInMonth || 31;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabel = monthNames[(monthlyTrend.month || 1) - 1] || '';

  const xForDay = (day: number) =>
    padL + ((day - 1) / Math.max(daysInMonth - 1, 1)) * plotW;
  const yForVal = (value: number) =>
    padT + plotH - (Math.min(value, maxY) / maxY) * plotH;

  const points = monthlyTrend.points || [];
  const linePoints =
    points.length > 0
      ? points.map((d) => `${xForDay(d.day)},${yForVal(d.value)}`).join(' ')
      : '';

  const xTicks = [1, 5, 10, 15, 20, 25, daysInMonth].filter(
    (d, i, arr) => d <= daysInMonth && arr.indexOf(d) === i
  );
  const yTicks = [0, 10, 20, 30, 40, 50];

  return (
    <div className="flex flex-col gap-2.5 h-full overflow-hidden">
      {/* KPI row - main metrics */}
      <div className="grid grid-cols-4 gap-2.5 shrink-0">
        {[
          { icon: Users, color: 'bg-blue-50 text-[#1348f3]', label: 'Total OPD Consults', value: kpis.totalOpd, sub: 'Today', subColor: 'text-slate-400' },
          { icon: ClipboardCheck, color: 'bg-emerald-50 text-[#0d9f6e]', label: 'Advised for Admission', value: kpis.advised, sub: 'Today', subColor: 'text-slate-400' },
          { icon: BedDouble, color: 'bg-emerald-50 text-[#0d9f6e]', label: 'Actual Admissions', value: kpis.actual, sub: 'Today', subColor: 'text-slate-400' },
          { icon: TrendingUp, color: 'bg-blue-50 text-[#1348f3]', label: 'Overall Conversion Rate', value: `${kpis.conversion}%`, sub: 'From admission log', subColor: 'text-slate-400' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-white rounded-md border border-slate-200 shadow-sm px-3 py-2.5 flex items-center gap-2.5 h-[72px]">
              <div className={`w-8 h-8 rounded-md ${kpi.color} flex items-center justify-center shrink-0`}>
                <Icon size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 truncate">{kpi.label}</p>
                <p className="text-[18px] font-bold text-slate-900 leading-tight">{kpi.value}</p>
                <p className={`text-[10px] ${kpi.subColor} flex items-center gap-0.5`}>
                  {i < 3 && <Calendar size={10} />} {kpi.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Patient & payment mix */}
      <div className="grid grid-cols-4 gap-2.5 shrink-0">
        {[
          {
            icon: Shield,
            color: 'bg-blue-50 text-[#1348f3]',
            label: 'HMO',
            value: mix.hmo,
            sub: `${mix.hmoPct}% of payments`,
            subColor: 'text-blue-600',
          },
          {
            icon: Wallet,
            color: 'bg-amber-50 text-amber-600',
            label: 'CASH',
            value: mix.cash,
            sub: `${mix.cashPct}% of payments`,
            subColor: 'text-amber-600',
          },
          {
            icon: UserRound,
            color: 'bg-violet-50 text-violet-600',
            label: 'Private',
            value: mix.private,
            sub: 'Patient type',
            subColor: 'text-slate-400',
          },
          {
            icon: Footprints,
            color: 'bg-teal-50 text-teal-600',
            label: 'Walk-in',
            value: mix.walkIn,
            sub: 'Patient type',
            subColor: 'text-slate-400',
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-md border border-slate-200 shadow-sm px-3 py-2.5 flex items-center gap-2.5 h-[72px]"
            >
              <div
                className={`w-8 h-8 rounded-md ${kpi.color} flex items-center justify-center shrink-0`}
              >
                <Icon size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 truncate">{kpi.label}</p>
                <p className="text-[18px] font-bold text-slate-900 leading-tight">{kpi.value}</p>
                <p className={`text-[10px] ${kpi.subColor}`}>{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main body: equal-height columns */}
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-2.5 items-stretch">
        {/* LEFT 2/3 */}
        <div className="col-span-2 grid grid-rows-[minmax(0,1fr)_minmax(0,1.05fr)] gap-2.5 min-h-0">
          {/* Gauge + Chart — same row height, aligned */}
          <div className="grid gap-2.5 min-h-0" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)' }}>
            {/* Conversion gauge - larger */}
            <div className="bg-white rounded-md border border-slate-200 shadow-sm p-3 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-slate-800 text-[12px]">OPD to IPD Conversion Rate</h3>
                <span className="w-3.5 h-3.5 rounded-full bg-slate-100 text-slate-400 text-[9px] flex items-center justify-center">i</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="relative w-full max-w-[200px] aspect-[2/1.1]">
                  <svg viewBox="0 0 200 110" className="w-full h-full">
                    <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="#e8eef7" strokeWidth="16" strokeLinecap="round" />
                    <path
                      d="M 15 100 A 85 85 0 0 1 185 100"
                      fill="none"
                      stroke="url(#g1)"
                      strokeWidth="16"
                      strokeLinecap="round"
                      strokeDasharray={`${(Math.min(kpis.conversion, 100) / 100) * 267} 267`}
                    />
                    <defs>
                      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0d9f6e" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                    <span className="text-[26px] font-bold text-slate-900 leading-none">{kpis.conversion}%</span>
                    <span className="text-[10px] text-slate-500">Overall Conversion Rate</span>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-0.5 text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                  Live from admission log
                </div>
                <p className="mt-1 text-[9.5px] text-slate-500 text-center">
                  {`Target: ≥ ${targetConversion}% | On track to achieve daily target`}
                </p>
              </div>
            </div>

            {/* Trend chart — line and dots share the same SVG coordinates */}
            <div className="bg-white rounded-md border border-slate-200 shadow-sm p-3 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between shrink-0 mb-1">
                <h3 className="font-semibold text-slate-800 text-[12px]">Monthly Conversion Rate Trend</h3>
                <span className="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 bg-white">
                  {monthLabel} {monthlyTrend.year}
                </span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {points.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-400">
                    No conversion data this month yet
                  </div>
                ) : (
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Horizontal grid + Y labels */}
                    {yTicks.map((tick) => {
                      const y = yForVal(tick);
                      return (
                        <g key={tick}>
                          <line
                            x1={padL}
                            y1={y}
                            x2={chartW - padR}
                            y2={y}
                            stroke="#e8eef7"
                            strokeWidth="1"
                            strokeDasharray="4 3"
                          />
                          <text
                            x={padL - 6}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="#94a3b8"
                          >
                            {tick}%
                          </text>
                        </g>
                      );
                    })}
                    {/* X labels */}
                    {xTicks.map((day) => (
                      <text
                        key={day}
                        x={xForDay(day)}
                        y={chartH - 8}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#94a3b8"
                      >
                        {day === 1 || day === daysInMonth ? `${day} ${monthLabel}` : String(day)}
                      </text>
                    ))}
                    {/* Line connecting points */}
                    {points.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#0d9f6e"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={linePoints}
                      />
                    )}
                    {/* Dots on same coordinates as line */}
                    {points.map((d) => (
                      <circle
                        key={d.day}
                        cx={xForDay(d.day)}
                        cy={yForVal(d.value)}
                        r="4"
                        fill="white"
                        stroke="#0d9f6e"
                        strokeWidth="2"
                      >
                        <title>{`${d.day} ${monthLabel}: ${d.value}%`}</title>
                      </circle>
                    ))}
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-500 shrink-0">
                <span className="w-3 h-0.5 bg-[#0d9f6e] rounded" /> Conversion Rate (%)
              </div>
            </div>
          </div>

          {/* Top 5 Physicians */}
          <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden min-h-0 flex flex-col h-full">
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">🏆</span>
                <h3 className="font-semibold text-slate-800 text-[12px]">
                  Top 5 Physicians by Conversion Rate
                </h3>
              </div>
              <span className="text-[9.5px] text-slate-400">Ranked by conversion rate · Today</span>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-[11.5px] table-fixed">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="w-12 px-2 py-1.5 font-medium text-[10px]">Rank</th>
                    <th className="w-[28%] px-2 py-1.5 font-medium text-[10px]">Physician</th>
                    <th className="w-[22%] px-2 py-1.5 font-medium text-[10px]">Department</th>
                    <th className="w-[12%] px-2 py-1.5 font-medium text-[10px] text-right">OPD Consults</th>
                    <th className="w-[12%] px-2 py-1.5 font-medium text-[10px] text-right">Admissions</th>
                    <th className="w-[14%] px-2 py-1.5 font-medium text-[10px] text-right">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topPhysicians.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                        No data yet
                      </td>
                    </tr>
                  ) : (
                    topPhysicians.map((p, idx) => {
                      const dept = departmentByName[p.physician] || '—';
                      return (
                        <tr key={p.physician} className="border-b border-slate-50 last:border-0">
                          <td className="px-2 py-1.5">
                            <span
                              className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
                                idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-[8px] font-bold text-blue-700 shrink-0">
                                {p.physician
                                  .replace('Dr. ', '')
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </div>
                              <span className="font-medium text-slate-800 truncate">{p.physician}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-slate-500 truncate">{dept}</td>
                          <td className="px-2 py-1.5 text-right text-slate-600 tabular-nums">{p.totalOpdConsults}</td>
                          <td className="px-2 py-1.5 text-right text-slate-600 tabular-nums">
                            {p.actualAdmissionsFromOpd}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <span
                              className={`inline-flex items-center gap-0.5 font-semibold ${
                                p.conversionRate >= goodThreshold
                                  ? 'text-emerald-600'
                                  : p.conversionRate >= averageThreshold
                                  ? 'text-amber-600'
                                  : 'text-red-500'
                              }`}
                            >
                              {p.conversionRate}%
                              {p.conversionRate >= goodThreshold ? (
                                <ArrowUpRight size={11} />
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT 1/3: equal split diagnoses / complaints */}
        <div className="grid grid-rows-2 gap-2.5 min-h-0 h-full">
          {/* Top 5 Diagnoses */}
          <div className="bg-white rounded-md border border-slate-200 shadow-sm p-3 flex flex-col min-h-0 overflow-hidden h-full">
            <h3 className="font-semibold text-slate-800 text-[12px] shrink-0 mb-1.5">
              Top 5 Diagnoses
            </h3>
            <div className="flex-1 overflow-y-auto min-h-0">
              {topDiagnoses.length === 0 ? (
                <p className="text-center text-slate-400 py-4 text-[11px]">No data yet</p>
              ) : (
                topDiagnoses.map((item, idx) => {
                  const max = topDiagnoses[0]?.count || 1;
                  const pct = Math.round((item.count / max) * 100);
                  return (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0"
                    >
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold shrink-0 ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-[11px] truncate leading-tight">
                          {item.name}
                        </p>
                        <div className="mt-0.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1348f3] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 shrink-0">
                        {item.count}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top 5 Chief Complaints */}
          <div className="bg-white rounded-md border border-slate-200 shadow-sm p-3 flex flex-col min-h-0 overflow-hidden h-full">
            <h3 className="font-semibold text-slate-800 text-[12px] shrink-0 mb-1.5">
              Top 5 Chief Complaints
            </h3>
            <div className="flex-1 overflow-y-auto min-h-0">
              {topComplaints.length === 0 ? (
                <p className="text-center text-slate-400 py-4 text-[11px]">No data yet</p>
              ) : (
                topComplaints.map((item, idx) => {
                  const max = topComplaints[0]?.count || 1;
                  const pct = Math.round((item.count / max) * 100);
                  return (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0"
                    >
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold shrink-0 ${
                          idx === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-[11px] truncate leading-tight">
                          {item.name}
                        </p>
                        <div className="mt-0.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0d9f6e] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 shrink-0">
                        {item.count}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
