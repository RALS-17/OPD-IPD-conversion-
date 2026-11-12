import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, ChevronDown, Search } from 'lucide-react';
import type {
  Admission,
  OldNew,
  HhoCash,
  SourceOfAdmission,
  YesNo,
  PatientType,
} from '../types';

interface AdmissionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Admission, 'id' | 'createdAt'>) => void;
  initialData?: Admission | null;
  physicians: string[];
  departmentByName?: Record<string, string>;
  physicianMeta?: Record<
    string,
    { staffType?: string; specialization?: string; subSpecialization?: string }
  >;
}

const emptyForm = {
  patientName: '',
  address: '',
  oldNew: 'New' as OldNew,
  hhoCash: 'HHO' as HhoCash,
  source: 'OPD' as SourceOfAdmission,
  patientType: 'Private' as PatientType,
  chiefComplaint: '',
  diagnosis: '',
  advisedForAdmission: 'Yes' as YesNo,
  opdAttendingPhysician: '',
  opdPatientStatus: 'New' as OldNew,
  actuallyAdmitted: 'No' as YesNo,
  dateOfAdmission: new Date().toISOString().split('T')[0],
  timeOfAdmission: new Date().toTimeString().slice(0, 5),
  admittingPhysician: '',
  housePhysician: '',
  remarks: '',
};

/** Searchable physician picker with optional department filter */
function PhysicianPicker({
  value,
  onChange,
  physicians,
  departmentByName = {},
  physicianMeta = {},
  fieldClass,
  labelClass,
  label,
}: {
  value: string;
  onChange: (name: string) => void;
  physicians: string[];
  departmentByName?: Record<string, string>;
  physicianMeta?: Record<
    string,
    { staffType?: string; specialization?: string; subSpecialization?: string }
  >;
  fieldClass: string;
  labelClass: string;
  label: string;
}) {
  const [dept, setDept] = useState('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const departments = useMemo(() => {
    const set = new Set<string>();
    physicians.forEach((p) => {
      const d = (departmentByName[p] || '').trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [physicians, departmentByName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return physicians
      .filter((p) => {
        if (dept !== 'All') {
          const d = (departmentByName[p] || '').trim();
          if (d !== dept) return false;
        }
        if (q && !p.toLowerCase().includes(q)) return false;
        return true;
      })
      .slice(0, 80);
  }, [physicians, departmentByName, dept, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // When value is set externally and picker is closed, show it in the input area
  const displayValue = open ? query : value;

  return (
    <div ref={wrapRef} className="space-y-1.5">
      <div>
        <label className={labelClass}>Department</label>
        <select
          value={dept}
          onChange={(e) => {
            setDept(e.target.value);
            setOpen(true);
            // If current value is outside new dept, clear selection
            if (e.target.value !== 'All' && value) {
              const d = (departmentByName[value] || '').trim();
              if (d && d !== e.target.value) onChange('');
            }
          }}
          className={fieldClass}
        >
          <option value="All">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="relative">
        <label className={labelClass}>{label}</label>
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={displayValue}
            placeholder={value ? value : 'Type name to search…'}
            onFocus={() => {
              setOpen(true);
              setQuery('');
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (!e.target.value) onChange('');
            }}
            className={`${fieldClass} pl-7 pr-7`}
            autoComplete="off"
          />
          <ChevronDown
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
        {open && (
          <div className="absolute z-20 left-0 right-0 mt-0.5 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-[11px] text-slate-400">No matching physicians</p>
            ) : (
              filtered.map((p) => {
                const d = (departmentByName[p] || '').trim();
                const meta = physicianMeta[p];
                const bits = [
                  d,
                  meta?.staffType,
                  meta?.specialization,
                  meta?.subSpecialization,
                ].filter(Boolean);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      onChange(p);
                      setQuery('');
                      setOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-[11.5px] hover:bg-blue-50 ${
                      p === value ? 'bg-blue-50 text-[#1348f3] font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span className="block truncate">{p}</span>
                    {bits.length > 0 && (
                      <span className="block text-[9.5px] text-slate-400 truncate">
                        {bits.join(' · ')}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdmissionForm({
  isOpen,
  onClose,
  onSave,
  initialData,
  physicians,
  departmentByName = {},
  physicianMeta = {},
}: AdmissionFormProps) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (initialData) {
      setForm({
        patientName: initialData.patientName,
        address: initialData.address,
        oldNew: initialData.oldNew,
        hhoCash: initialData.hhoCash,
        source: initialData.source,
        patientType: initialData.patientType || 'Private',
        chiefComplaint: initialData.chiefComplaint,
        diagnosis: initialData.diagnosis,
        advisedForAdmission: initialData.advisedForAdmission,
        opdAttendingPhysician: initialData.opdAttendingPhysician,
        opdPatientStatus: initialData.opdPatientStatus || 'New',
        actuallyAdmitted: initialData.actuallyAdmitted,
        dateOfAdmission: initialData.dateOfAdmission,
        timeOfAdmission: initialData.timeOfAdmission || '',
        admittingPhysician: initialData.admittingPhysician,
        housePhysician: initialData.housePhysician || '',
        remarks: initialData.remarks,
      });
    } else {
      setForm({
        ...emptyForm,
        dateOfAdmission: new Date().toISOString().split('T')[0],
        timeOfAdmission: new Date().toTimeString().slice(0, 5),
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName.trim()) return;
    onSave(form);
    onClose();
  };

  const field =
    'w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 focus:border-[#1348f3] placeholder:text-slate-400';
  const labelCls = 'block text-[11px] font-medium text-slate-600 mb-0.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-md shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900">
              {initialData ? 'Edit Admission Record' : 'New Admission Record'}
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Only Patient Name is required
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2.5">
            {/* LEFT */}
            <div className="space-y-2.5">
              <div>
                <label className={labelCls}>Patient Name *</label>
                <input
                  required
                  name="patientName"
                  value={form.patientName}
                  onChange={handleChange}
                  className={field}
                  placeholder="Enter patient name"
                  maxLength={120}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Old / New (Hospital)</label>
                  <select name="oldNew" value={form.oldNew} onChange={handleChange} className={field}>
                    <option value="New">New</option>
                    <option value="Old">Old</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>HMO / CASH</label>
                  <select name="hhoCash" value={form.hhoCash} onChange={handleChange} className={field}>
                    <option value="HHO">HMO (HHO)</option>
                    <option value="CASH">CASH</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Patient type</label>
                  <select
                    name="patientType"
                    value={form.patientType}
                    onChange={handleChange}
                    className={field}
                  >
                    <option value="Private">Private</option>
                    <option value="Walk-in">Walk-in</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Source of Admission</label>
                  <select name="source" value={form.source} onChange={handleChange} className={field}>
                    <option value="OPD">OPD</option>
                    <option value="ER">ER</option>
                    <option value="Direct">Direct</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Chief Complaint</label>
                <input
                  name="chiefComplaint"
                  value={form.chiefComplaint}
                  onChange={handleChange}
                  className={field}
                  placeholder="Chief complaint"
                  maxLength={200}
                />
              </div>

              <div>
                <label className={labelCls}>Diagnosis</label>
                <input
                  name="diagnosis"
                  value={form.diagnosis}
                  onChange={handleChange}
                  className={field}
                  placeholder="Diagnosis"
                  maxLength={200}
                />
              </div>

              <div>
                <label className={labelCls}>Remarks (HAMA/THOC)</label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  rows={3}
                  className={`${field} resize-none`}
                  placeholder="Enter remarks (optional)"
                  maxLength={300}
                />
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between py-0.5">
                <label className="text-[11px] font-medium text-slate-600">Advised for Admission</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        advisedForAdmission: p.advisedForAdmission === 'Yes' ? 'No' : 'Yes',
                      }))
                    }
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      form.advisedForAdmission === 'Yes' ? 'bg-[#1348f3]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        form.advisedForAdmission === 'Yes' ? 'translate-x-4' : ''
                      }`}
                    />
                  </button>
                  <span className="text-[11px] font-medium text-slate-700 w-6">
                    {form.advisedForAdmission}
                  </span>
                </div>
              </div>

              <PhysicianPicker
                label="OPD Attending Physician"
                value={form.opdAttendingPhysician}
                onChange={(name) => setForm((p) => ({ ...p, opdAttendingPhysician: name }))}
                physicians={physicians}
                departmentByName={departmentByName}
                physicianMeta={physicianMeta}
                fieldClass={field}
                labelClass={labelCls}
              />

              <div>
                <label className={labelCls}>Old / New to this OPD doctor</label>
                <select
                  name="opdPatientStatus"
                  value={form.opdPatientStatus}
                  onChange={handleChange}
                  className={field}
                >
                  <option value="New">New to this doctor</option>
                  <option value="Old">Old patient of this doctor</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Separate from hospital Old/New — e.g. returning patient, first time with this doctor.
                </p>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <label className="text-[11px] font-medium text-slate-600">Actually Admitted</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        actuallyAdmitted: p.actuallyAdmitted === 'Yes' ? 'No' : 'Yes',
                      }))
                    }
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      form.actuallyAdmitted === 'Yes' ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        form.actuallyAdmitted === 'Yes' ? 'translate-x-4' : ''
                      }`}
                    />
                  </button>
                  <span className="text-[11px] font-medium text-slate-700 w-6">
                    {form.actuallyAdmitted}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Date of Admission</label>
                  <input
                    type="date"
                    name="dateOfAdmission"
                    value={form.dateOfAdmission}
                    onChange={handleChange}
                    className={field}
                  />
                </div>
                <div>
                  <label className={labelCls}>Time of Admission</label>
                  <input
                    type="time"
                    name="timeOfAdmission"
                    value={form.timeOfAdmission}
                    onChange={handleChange}
                    className={field}
                  />
                </div>
              </div>

              <PhysicianPicker
                label="Admitting Physician"
                value={form.admittingPhysician}
                onChange={(name) => setForm((p) => ({ ...p, admittingPhysician: name }))}
                physicians={physicians}
                departmentByName={departmentByName}
                physicianMeta={physicianMeta}
                fieldClass={field}
                labelClass={labelCls}
              />

              <PhysicianPicker
                label="House Physician"
                value={form.housePhysician}
                onChange={(name) => setForm((p) => ({ ...p, housePhysician: name }))}
                physicians={physicians}
                departmentByName={departmentByName}
                physicianMeta={physicianMeta}
                fieldClass={field}
                labelClass={labelCls}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[12px] font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-[#1348f3] rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Save size={13} />
              {initialData ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
