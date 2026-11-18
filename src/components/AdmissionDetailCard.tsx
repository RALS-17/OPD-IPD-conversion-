import { useEffect, type ReactNode } from 'react';
import {
  X,
  Edit2,
  Trash2,
  User,
  MapPin,
  Stethoscope,
  CalendarClock,
  ClipboardList,
  AlertTriangle,
  BedDouble,
} from 'lucide-react';
import type { Admission } from '../types';
import { formatTime12 } from '../hooks/useAdmissions';

interface AdmissionDetailCardProps {
  admission: Admission;
  /** Warning labels for this record (missing physician, duplicate, …) */
  warnings?: string[];
  departmentByName?: Record<string, string>;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

const EMPTY = '—';

function show(v: string | null | undefined): string {
  const t = (v ?? '').trim();
  return t || EMPTY;
}

function prettyDate(ymd: string): string {
  if (!ymd) return EMPTY;
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-[12.5px] text-slate-800 mt-0.5 break-words whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon size={13} className="text-[#1348f3]" />
        <h3 className="text-[11.5px] font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">{children}</div>
    </section>
  );
}

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

export default function AdmissionDetailCard({
  admission: a,
  warnings = [],
  departmentByName = {},
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  onClose,
}: AdmissionDetailCardProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const admitted = a.actuallyAdmitted === 'Yes';
  const opdDept = (departmentByName[a.opdAttendingPhysician] || '').trim();
  const admittingDept = (departmentByName[a.admittingPhysician] || '').trim();
  const created = new Date(a.createdAt);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label={`Patient details: ${a.patientName}`}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-xl bg-[#f4f7fb] shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200 rounded-t-xl">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Patient details
            </p>
            <h2 className="text-[16px] font-bold text-slate-900 leading-tight break-words">
              {show(a.patientName)}
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Pill
                className={
                  admitted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }
              >
                {admitted ? 'Admitted' : 'Not admitted'}
              </Pill>
              <Pill className="bg-slate-100 text-slate-700">Source: {a.source}</Pill>
              <Pill
                className={
                  a.hhoCash === 'HHO' ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700'
                }
              >
                {a.hhoCash === 'HHO' ? 'HMO' : 'CASH'}
              </Pill>
              <Pill
                className={
                  a.patientType === 'Walk-in'
                    ? 'bg-teal-50 text-teal-700'
                    : 'bg-indigo-50 text-indigo-700'
                }
              >
                {a.patientType || 'Private'}
              </Pill>
              <Pill className="bg-sky-50 text-sky-700">{a.oldNew} patient</Pill>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-3 space-y-2.5">
          {warnings.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800">
              <AlertTriangle size={14} className="shrink-0 mt-px" />
              <p>{warnings.join(' · ')}</p>
            </div>
          )}

          <Section icon={User} title="Patient">
            <Field label="Full name">{show(a.patientName)}</Field>
            <Field label="Hospital status">{a.oldNew === 'Old' ? 'Old patient' : 'New patient'}</Field>
            <Field label="Patient type">{a.patientType || 'Private'}</Field>
            <Field label="Payment">{a.hhoCash === 'HHO' ? 'HMO' : 'Cash'}</Field>
            <Field label="Address" wide>
              <span className="inline-flex items-start gap-1">
                <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                <span>{show(a.address)}</span>
              </span>
            </Field>
          </Section>

          <Section icon={ClipboardList} title="Clinical">
            <Field label="Chief complaint" wide>
              {show(a.chiefComplaint)}
            </Field>
            <Field label="Diagnosis" wide>
              {show(a.diagnosis)}
            </Field>
            <Field label="Advised for admission">
              <span
                className={a.advisedForAdmission === 'Yes' ? 'text-emerald-600 font-semibold' : ''}
              >
                {a.advisedForAdmission}
              </span>
            </Field>
            <Field label="Actually admitted">
              <span className={admitted ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                {a.actuallyAdmitted}
              </span>
            </Field>
            <Field label="Remarks" wide>
              {show(a.remarks)}
            </Field>
          </Section>

          <Section icon={CalendarClock} title="Date & source">
            <Field label="Date">{prettyDate(a.dateOfAdmission)}</Field>
            <Field label="Time">{formatTime12(a.timeOfAdmission)}</Field>
            <Field label="Source of admission">{a.source}</Field>
          </Section>

          <Section icon={Stethoscope} title="Physicians">
            <Field label="OPD attending physician">
              {a.opdAttendingPhysician ? (
                <>
                  {a.opdAttendingPhysician}
                  {opdDept && <span className="block text-[11px] text-slate-500">{opdDept}</span>}
                </>
              ) : (
                <span className="text-amber-600 font-medium">Not assigned</span>
              )}
            </Field>
            <Field label="Patient to OPD doctor">
              {a.opdPatientStatus === 'Old' ? 'Old patient' : 'New patient'}
            </Field>
            <Field label="Admitting physician">
              {a.admittingPhysician ? (
                <>
                  {a.admittingPhysician}
                  {admittingDept && (
                    <span className="block text-[11px] text-slate-500">{admittingDept}</span>
                  )}
                </>
              ) : (
                EMPTY
              )}
            </Field>
            <Field label="House physician">{show(a.housePhysician)}</Field>
          </Section>

          <p className="flex items-center gap-1 text-[10px] text-slate-400 px-1">
            <BedDouble size={11} />
            Recorded {Number.isNaN(created.getTime()) ? EMPTY : created.toLocaleString()} · ID{' '}
            {a.id.slice(0, 8)}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-white border-t border-slate-200 rounded-b-xl">
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="mr-auto inline-flex items-center gap-1 px-2.5 py-1.5 text-[11.5px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-semibold text-white bg-[#1348f3] rounded-md hover:bg-blue-700"
            >
              <Edit2 size={12} /> Edit
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[11.5px] font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
