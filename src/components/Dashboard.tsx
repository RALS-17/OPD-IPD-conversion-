import { useMemo, useState } from 'react';
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
import type { Admission, PhysicianStats, RankedItem, SourceOfAdmission } from '../types';

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

type GaugeSource = 'OPD' | 'ER';

type KpiBlock = {
  totalOpd: number;
  advised: number;
  actual: number;
  conversion: number;
};

interface DashboardProps {
  kpis: KpiBlock;
  prevKpis?: KpiBlock | null;
  compareLabel?: string | null;
  mix: MixStats;
  physicianStats: PhysicianStats[];
  departmentByName?: Record<string, string>;
  topDiagnoses: RankedItem[];
  topComplaints: RankedItem[];
  monthlyTrend: MonthlyTrend;
  prevMonthlyTrend?: MonthlyTrend | null;
  targetConversion: number;
  goodThreshold: number;
  averageThreshold: number;
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  onDatePreset: (preset: string) => void;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  onExport: () => void;
  onPrintSnapshot?: () => void;
  filteredCount: number;
  /** Date-filtered admissions used for the conversion gauge (source filter applied inside). */
  filteredAdmissions: Admission[];
  onPhysicianClick?: (name: string) => void;
}

function deltaLabel(cur: number, prev: number | undefined | null, suffix = ''): string | null {
  if (prev === undefined || prev === null) return null;
  const d = Math.round((cur - prev) * 10) / 10;
  const sign = d > 0 ? '+' : '';
  return `${sign}${d}${suffix}`;
}

function deltaTone(cur: number, prev: number | undefined | null): string {
  if (prev === undefined || prev === null) return 'text-slate-400';
  if (cur > prev) return 'text-emerald-600';
  if (cur < prev) return 'text-red-500';
  return 'text-slate-400';
}

function dateFilterLabel(
  preset: string,
  dateFrom: string,
  dateTo: string
): string {
  switch (preset) {
    case 'today':
      return 'Today';
    case 'week':
      return 'Last 7 days';
    case 'month':
      return 'This month';
    case 'all':
      return 'All time';
    case 'custom':
      if (dateFrom && dateTo) return `${dateFrom} – ${dateTo}`;
      if (dateFrom) return `From ${dateFrom}`;
      if (dateTo) return `Until ${dateTo}`;
      return 'Custom range';
    default:
      return 'Selected period';
  }
}

function niceMax(peak: number): number {
  if (peak <= 0) return 10;
  // Pad ~15% above peak, then snap to a readable step
  const padded = peak * 1.15;
  if (padded <= 10) return 10;
  if (padded <= 20) return 20;
  if (padded <= 25) return 25;
  if (padded <= 40) return 40;
  if (padded <= 50) return 50;
  if (padded <= 60) return 60;
  if (padded <= 75) return 75;
  if (padded <= 100) return 100;
  return Math.ceil(padded / 10) * 10;
}

function buildYTicks(maxY: number): number[] {
  const steps = 5;
  const step = maxY / steps;
  const ticks: number[] = [];
  for (let i = 0; i <= steps; i++) {
    ticks.push(Math.round(step * i * 10) / 10);
  }
  return ticks;
}

export default function Dashboard({
  kpis,
  prevKpis = null,
  compareLabel = null,
  mix,
  physicianStats,
  departmentByName = {},
  topDiagnoses,
  topComplaints,
  monthlyTrend,
  prevMonthlyTrend = null,
  targetConversion,
  goodThreshold,
  averageThreshold,
  datePreset,
  dateFrom,
  dateTo,
  onDatePreset,
  onDateFrom,
  onDateTo,
  onExport,
  onPrintSnapshot,
  filteredCount,
  filteredAdmissions,
  onPhysicianClick,
}: DashboardProps) {
  const topPhysicians = physicianStats.slice(0, 5);
  const periodLabel = dateFilterLabel(datePreset, dateFrom, dateTo);

  // Gauge source mode: OPD → IPD (default) or ER → IPD
  const [gaugeSource, setGaugeSource] = useState<GaugeSource>('OPD');
  const [hoverPoint, setHoverPoint] = useState<{ day: number; value: number; x: number; y: number } | null>(null);
  const [showPrevTrend, setShowPrevTrend] = useState(true);

  const gaugeStats = useMemo(() => {
    const list = filteredAdmissions.filter(
      (a) => a.source === (gaugeSource as SourceOfAdmission)
    );
    const total = list.length;
    const admitted = list.filter((a) => a.actuallyAdmitted === 'Yes').length;
    const conversion =
      total > 0 ? Math.round((admitted / total) * 1000) / 10 : 0;
    return { total, admitted, conversion };
  }, [filteredAdmissions, gaugeSource]);

  // Chart geometry (single SVG so line + dots share coordinates)
  const chartW = 400;
  const chartH = 180;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const points = monthlyTrend.points || [];
  const prevPoints = prevMonthlyTrend?.points || [];
  const peakValue = Math.max(
    0,
    ...points.map((d) => d.value),
    ...(showPrevTrend ? prevPoints.map((d) => d.value) : [])
  );
  const maxY = niceMax(peakValue);
  const daysInMonth = monthlyTrend.daysInMonth || 31;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabel = monthNames[(monthlyTrend.month || 1) - 1] || '';

  const xForDay = (day: number) =>
    padL + ((day - 1) / Math.max(daysInMonth - 1, 1)) * plotW;
  const yForVal = (value: number) =>
    padT + plotH - (Math.min(value, maxY) / Math.max(maxY, 1)) * plotH;

  const linePoints =
    points.length > 0
      ? points.map((d) => `${xForDay(d.day)},${yForVal(d.value)}`).join(' ')
      : '';
  const prevLinePoints =
    prevPoints.length > 0
      ? prevPoints.map((d) => `${xForDay(d.day)},${yForVal(d.value)}`).join(' ')
      : '';

  const xTicks = [1, 5, 10, 15, 20, 25, daysInMonth].filter(
    (d, i, arr) => d <= daysInMonth && arr.indexOf(d) === i
  );
  const yTicks = buildYTicks(maxY);

  return (
    <div className="flex flex-col gap-1.5 h-full overflow-hidden">
      {/* Date range + export */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['today', 'week', 'month', 'all', 'custom'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onDatePreset(p)}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md border ${
                datePreset === p
                  ? 'bg-[#1348f3] text-white border-[#1348f3]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p === 'today' ? 'Today' : p === 'week' ? '7 days' : p === 'month' ? 'This month' : p === 'all' ? 'All' : 'Custom'}
            </button>
          ))}
          {datePreset === 'custom' && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFrom(e.target.value)}
                className="text-[10px] border border-slate-200 rounded-md px-1.5 py-1"
              />
              <span className="text-[10px] text-slate-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateTo(e.target.value)}
                className="text-[10px] border border-slate-200 rounded-md px-1.5 py-1"
              />
            </>
          )}
          <span className="text-[10px] text-slate-400 ml-1">{filteredCount} records</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onPrintSnapshot && (
            <button
              type="button"
              onClick={onPrintSnapshot}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Print / PDF
            </button>
          )}
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-white bg-[#0d9f6e] rounded-md hover:bg-emerald-700"
          >
            Export filtered CSV
          </button>
        </div>
      </div>
      {/* KPI row - main metrics */}
      <div className="grid grid-cols-4 gap-1.5 shrink-0">
        {[
          {
            icon: Users,
            color: 'bg-blue-50 text-[#1348f3]',
            label: 'Total OPD Consults',
            value: kpis.totalOpd,
            prev: prevKpis?.totalOpd,
            suffix: '',
          },
          {
            icon: ClipboardCheck,
            color: 'bg-emerald-50 text-[#0d9f6e]',
            label: 'Advised for Admission',
            value: kpis.advised,
            prev: prevKpis?.advised,
            suffix: '',
          },
          {
            icon: BedDouble,
            color: 'bg-emerald-50 text-[#0d9f6e]',
            label: 'Actual Admissions',
            value: kpis.actual,
            prev: prevKpis?.actual,
            suffix: '',
          },
          {
            icon: TrendingUp,
            color: 'bg-blue-50 text-[#1348f3]',
            label: 'Overall Conversion Rate',
            value: kpis.conversion,
            display: `${kpis.conversion}%`,
            prev: prevKpis?.conversion,
            suffix: ' pts',
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          const d = deltaLabel(kpi.value as number, kpi.prev, kpi.suffix);
          const tip = d
            ? `${kpi.label}: ${kpi.display ?? kpi.value} · ${periodLabel} · ${d} ${compareLabel || ''}`
            : `${kpi.label}: ${kpi.display ?? kpi.value} · ${periodLabel}`;
          return (
            <div
              key={i}
              className="dash-card dash-tip bg-white rounded-md border border-slate-200 shadow-sm px-3 py-2.5 flex items-center gap-2.5 h-[72px]"
              data-tip={tip}
            >
              <div className={`w-8 h-8 rounded-md ${kpi.color} flex items-center justify-center shrink-0`}>
                <Icon size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 truncate">{kpi.label}</p>
                <p className="text-[18px] font-bold text-slate-900 leading-tight">
                  {kpi.display ?? kpi.value}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
                  <span className="inline-flex items-center gap-0.5">
                    <Calendar size={10} /> {periodLabel}
                  </span>
                  {d && (
                    <span className={`font-semibold ${deltaTone(kpi.value as number, kpi.prev)}`}>
                      {d}
                      {compareLabel ? ` ${compareLabel.replace(/^vs /, '')}` : ''}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Patient & payment mix */}
      <div className="grid grid-cols-4 gap-1.5 shrink-0">
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
              className="dash-card dash-tip bg-white rounded-md border border-slate-200 shadow-sm px-3 py-2.5 flex items-center gap-2.5 h-[72px]"
              data-tip={`${kpi.label}: ${kpi.value} · ${kpi.sub}`}
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

      {/* Main body: left (gauge+chart / physicians) | right (diagnoses / complaints) */}
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-1.5 items-stretch">
        {/* LEFT 2/3 */}
        <div className="col-span-2 grid grid-rows-2 gap-1.5 min-h-0">
          {/* Gauge + Chart — same row height */}
          <div className="grid min-h-0 gap-1.5" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)' }}>
            {/* Conversion gauge */}
            <div className="dash-card bg-white rounded-md border border-slate-200 shadow-sm p-2.5 flex flex-col overflow-hidden min-h-0 h-full">
              <div className="flex items-center justify-between shrink-0 gap-1">
                <h3 className="font-semibold text-slate-800 text-[12px] truncate">
                  {gaugeSource === 'OPD' ? 'OPD → IPD' : 'ER → IPD'} Conversion
                </h3>
                <div className="flex items-center gap-0.5 shrink-0">
                  {(['OPD', 'ER'] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setGaugeSource(src)}
                      className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border transition-colors ${
                        gaugeSource === src
                          ? 'bg-[#1348f3] text-white border-[#1348f3]'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
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
                      strokeDasharray={`${(Math.min(gaugeStats.conversion, 100) / 100) * 267} 267`}
                    />
                    <defs>
                      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0d9f6e" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                    <span className="text-[26px] font-bold text-slate-900 leading-none">{gaugeStats.conversion}%</span>
                    <span className="text-[10px] text-slate-500">
                      {gaugeSource === 'OPD' ? 'OPD → IPD' : 'ER → IPD'} rate
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-0.5 text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                  {gaugeStats.admitted} admitted / {gaugeStats.total} {gaugeSource} · {periodLabel}
                </div>
                <p className="mt-1 text-[9.5px] text-slate-500 text-center">
                  {`Target: ≥ ${targetConversion}% · Direct excluded`}
                </p>
              </div>
            </div>

            {/* Trend chart — line and dots share the same SVG coordinates */}
            <div className="dash-card bg-white rounded-md border border-slate-200 shadow-sm p-2.5 flex flex-col overflow-hidden min-h-0 h-full">
              <div className="flex items-center justify-between shrink-0 mb-1 gap-2">
                <h3 className="font-semibold text-slate-800 text-[12px]">Monthly Conversion Rate Trend</h3>
                {prevPoints.length > 0 && (
                  <label className="inline-flex items-center gap-1 text-[9.5px] text-slate-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPrevTrend}
                      onChange={(e) => setShowPrevTrend(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    {compareLabel || 'Prior period'}
                  </label>
                )}
              </div>
              <div className="flex-1 min-h-0 relative">
                {points.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-3">
                    <p className="text-[11px] font-medium text-slate-600">No conversion points yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Add admissions with dates this month, or switch the date filter.
                    </p>
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
                    {/* Prior period line (comparison) */}
                    {showPrevTrend && prevPoints.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="4 3"
                        points={prevLinePoints}
                        opacity={0.85}
                      />
                    )}
                    {/* Current period line */}
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
                    {/* Dots + large hit area for instant hover */}
                    {points.map((d) => {
                      const cx = xForDay(d.day);
                      const cy = yForVal(d.value);
                      const active = hoverPoint?.day === d.day;
                      return (
                        <g
                          key={d.day}
                          onMouseEnter={() => setHoverPoint({ day: d.day, value: d.value, x: cx, y: cy })}
                          onMouseLeave={() => setHoverPoint(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Invisible larger hit target — no delay */}
                          <circle cx={cx} cy={cy} r="12" fill="transparent" />
                          <circle
                            cx={cx}
                            cy={cy}
                            r={active ? 5.5 : 4}
                            fill="white"
                            stroke="#0d9f6e"
                            strokeWidth={active ? 2.5 : 2}
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}
                {/* Instant tooltip for chart point */}
                {hoverPoint && (
                  <div
                    className="pointer-events-none absolute z-20 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-semibold shadow-md whitespace-nowrap"
                    style={{
                      left: `${(hoverPoint.x / chartW) * 100}%`,
                      top: `${(hoverPoint.y / chartH) * 100}%`,
                      transform: 'translate(-50%, calc(-100% - 8px))',
                    }}
                  >
                    Day {hoverPoint.day}{monthLabel ? ` ${monthLabel}` : ''}: {hoverPoint.value}%
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-500 shrink-0 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-[#0d9f6e] rounded" /> Current
                </span>
                {showPrevTrend && prevPoints.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-slate-400 rounded border-t border-dashed" /> Prior
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top 5 Physicians */}
          <div className="dash-card bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden min-h-0 flex flex-col h-full">
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">🏆</span>
                <h3 className="font-semibold text-slate-800 text-[12px]">
                  Top 5 Physicians by Conversion Rate
                </h3>
              </div>
              <span className="text-[9.5px] text-slate-400">Ranked by conversion rate · {periodLabel}</span>
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
                      <td colSpan={6} className="px-3 py-6 text-center">
                        <p className="text-[12px] font-medium text-slate-600">No physician stats yet</p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">
                          Add admissions with an OPD attending physician for this period.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    topPhysicians.map((p, idx) => {
                      const dept = departmentByName[p.physician] || '—';
                      return (
                        <tr
                          key={p.physician}
                          className="dash-row border-b border-slate-50 last:border-0"
                          title={`${p.physician}: ${p.conversionRate}% (${p.actualAdmissionsFromOpd}/${p.totalOpdConsults})`}
                        >
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
                            <button
                              type="button"
                              onClick={() => onPhysicianClick?.(p.physician)}
                              className="flex items-center gap-1.5 min-w-0 text-left group"
                              title="View physician details"
                            >
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-[8px] font-bold text-blue-700 shrink-0">
                                {p.physician
                                  .replace('Dr. ', '')
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </div>
                              <span className="font-medium text-slate-800 truncate group-hover:text-[#1348f3] group-hover:underline">
                                {p.physician}
                              </span>
                            </button>
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

        {/* RIGHT 1/3: diagnoses on top, complaints below — equal height, aligned to left */}
        <div className="grid grid-rows-2 gap-1.5 min-h-0 h-full">
          {/* Top 5 Diagnoses */}
          <div className="dash-card bg-white rounded-md border border-slate-200 shadow-sm p-2.5 flex flex-col min-h-0 overflow-hidden h-full">
            <h3 className="font-semibold text-slate-800 text-[12px] shrink-0 mb-1">
              Top 5 Diagnoses
            </h3>
            <div className="flex-1 overflow-hidden min-h-0">
              {topDiagnoses.length === 0 ? (
                <div className="text-center py-4 px-2">
                  <p className="text-[11px] font-medium text-slate-600">No diagnoses yet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Fill diagnosis on admission rows.</p>
                </div>
              ) : (
                topDiagnoses.map((item, idx) => {
                  const max = topDiagnoses[0]?.count || 1;
                  const pct = Math.round((item.count / max) * 100);
                  return (
                    <div
                      key={item.name}
                      className="dash-row dash-tip flex items-center gap-2 py-1.5 px-1 -mx-1 rounded border-b border-slate-50 last:border-0"
                      data-tip={`${item.name}: ${item.count}`}
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
          <div className="dash-card bg-white rounded-md border border-slate-200 shadow-sm p-2.5 flex flex-col min-h-0 overflow-hidden h-full">
            <h3 className="font-semibold text-slate-800 text-[12px] shrink-0 mb-1">
              Top 5 Chief Complaints
            </h3>
            <div className="flex-1 overflow-hidden min-h-0">
              {topComplaints.length === 0 ? (
                <div className="text-center py-4 px-2">
                  <p className="text-[11px] font-medium text-slate-600">No chief complaints yet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Fill chief complaint on admission rows.</p>
                </div>
              ) : (
                topComplaints.map((item, idx) => {
                  const max = topComplaints[0]?.count || 1;
                  const pct = Math.round((item.count / max) * 100);
                  return (
                    <div
                      key={item.name}
                      className="dash-row dash-tip flex items-center gap-2 py-1.5 px-1 -mx-1 rounded border-b border-slate-50 last:border-0"
                      data-tip={`${item.name}: ${item.count}`}
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
