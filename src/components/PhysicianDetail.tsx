import { useMemo } from 'react';
import { X } from 'lucide-react';
import type { Admission } from '../types';
import { formatTime12 } from '../hooks/useAdmissions';

interface PhysicianDetailProps {
  physician: string;
  admissions: Admission[];
  department?: string;
  goodThreshold: number;
  averageThreshold: number;
  onClose: () => void;
}

export default function PhysicianDetail({
  physician,
  admissions,
  department,
  goodThreshold,
  averageThreshold,
  onClose,
}: PhysicianDetailProps) {
  const mine = useMemo(
    () =>
      admissions.filter(
        (a) => (a.opdAttendingPhysician || '').trim() === physician.trim()
      ),
    [admissions, physician]
  );

  const total = mine.length;
  const advised = mine.filter((a) => a.advisedForAdmission === 'Yes').length;
  const admitted = mine.filter((a) => a.actuallyAdmitted === 'Yes').length;
  const rate = total > 0 ? Math.round((admitted / total) * 1000) / 10 : 0;

  const rateColor =
    rate >= goodThreshold
      ? 'text-emerald-600'
      : rate >= averageThreshold
        ? 'text-amber-600'
        : 'text-red-500';

  const diagnoses = useMemo(() => {
    const map = new Map<string, number>();
    mine.forEach((a) => {
      const d = (a.diagnosis || '').trim();
      if (!d) return;
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [mine]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { total: number; admitted: number }>();
    mine.forEach((a) => {
      if (!a.dateOfAdmission) return;
      const key = a.dateOfAdmission.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, { total: 0, admitted: 0 });
      const row = map.get(key)!;
      row.total += 1;
      if (a.actuallyAdmitted === 'Yes') row.admitted += 1;
    });
    return Array.from(map.entries())
      .map(([month, v]) => ({
        month,
        rate: v.total > 0 ? Math.round((v.admitted / v.total) * 1000) / 10 : 0,
        total: v.total,
        admitted: v.admitted,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [mine]);

  const maxBar = Math.max(...byMonth.map((m) => m.rate), 1);
  const recent = [...mine]
    .sort((a, b) => (b.dateOfAdmission || '').localeCompare(a.dateOfAdmission || ''))
    .slice(0, 12);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xl flex flex-col">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-slate-900 truncate">{physician}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {department || '—'} · Physician drill-down
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'OPD consults', value: total },
              { label: 'Advised', value: advised },
              { label: 'Admitted', value: admitted },
              { label: 'Conversion', value: `${rate}%`, className: rateColor },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2"
              >
                <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
                <p className={`text-[16px] font-bold leading-tight ${s.className || 'text-slate-900'}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Conversion over months */}
          <div className="rounded-md border border-slate-200 p-3">
            <h3 className="text-[12px] font-semibold text-slate-800 mb-2">
              Conversion over time (by month)
            </h3>
            {byMonth.length === 0 ? (
              <p className="text-[11px] text-slate-400">No dated admissions for this physician.</p>
            ) : (
              <div className="flex items-end gap-2 h-[100px]">
                {byMonth.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-[9px] font-semibold text-slate-600">{m.rate}%</span>
                    <div
                      className="w-full max-w-[36px] rounded-t bg-[#0d9f6e]/80"
                      style={{ height: `${Math.max(4, (m.rate / maxBar) * 72)}px` }}
                      title={`${m.month}: ${m.admitted}/${m.total}`}
                    />
                    <span className="text-[9px] text-slate-400 truncate w-full text-center">
                      {m.month.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-md border border-slate-200 p-3">
              <h3 className="text-[12px] font-semibold text-slate-800 mb-2">Top diagnoses</h3>
              {diagnoses.length === 0 ? (
                <p className="text-[11px] text-slate-400">No diagnoses recorded.</p>
              ) : (
                <ul className="space-y-1.5">
                  {diagnoses.map((d, i) => (
                    <li key={d.name} className="flex items-center gap-2 text-[11px]">
                      <span className="w-4 text-slate-400 font-semibold">{i + 1}</span>
                      <span className="flex-1 truncate text-slate-700">{d.name}</span>
                      <span className="font-semibold text-slate-600">{d.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-slate-200 p-3">
              <h3 className="text-[12px] font-semibold text-slate-800 mb-2">
                Recent admissions
              </h3>
              {recent.length === 0 ? (
                <p className="text-[11px] text-slate-400">No admissions.</p>
              ) : (
                <ul className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {recent.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-2 text-[11px] border-b border-slate-50 last:border-0 pb-1"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{a.patientName}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {a.diagnosis || a.chiefComplaint || '—'} · {a.source}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-slate-600">{a.dateOfAdmission || '—'}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatTime12(a.timeOfAdmission)}
                        </p>
                        <p
                          className={
                            a.actuallyAdmitted === 'Yes'
                              ? 'text-emerald-600 font-semibold'
                              : 'text-amber-600'
                          }
                        >
                          {a.actuallyAdmitted === 'Yes' ? 'Admitted' : 'Pending'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
