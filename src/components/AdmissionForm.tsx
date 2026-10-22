import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
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
  actuallyAdmitted: 'No' as YesNo,
  dateOfAdmission: new Date().toISOString().split('T')[0],
  timeOfAdmission: new Date().toTimeString().slice(0, 5),
  admittingPhysician: '',
  remarks: '',
};

export default function AdmissionForm({
  isOpen,
  onClose,
  onSave,
  initialData,
  physicians,
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
        actuallyAdmitted: initialData.actuallyAdmitted,
        dateOfAdmission: initialData.dateOfAdmission,
        timeOfAdmission: initialData.timeOfAdmission || '',
        admittingPhysician: initialData.admittingPhysician,
        remarks: initialData.remarks,
      });
    } else {
      setForm(emptyForm);
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
    if (!form.patientName.trim() || !form.address.trim()) return;
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
              Only Patient Name and Address are required
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
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5">
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
                  maxLength={100}
                />
              </div>

              <div>
                <label className={labelCls}>Address *</label>
                <input
                  required
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className={field}
                  placeholder="Enter address"
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Old / New</label>
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
                    <option value="ER">ER</option>
                    <option value="OPD">OPD</option>
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
                  placeholder="Enter chief complaint"
                  maxLength={150}
                />
              </div>

              <div>
                <label className={labelCls}>Diagnosis</label>
                <input
                  name="diagnosis"
                  value={form.diagnosis}
                  onChange={handleChange}
                  className={field}
                  placeholder="Enter diagnosis"
                  maxLength={150}
                />
              </div>
            </div>

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

              <div>
                <label className={labelCls}>OPD Attending Physician</label>
                <select
                  name="opdAttendingPhysician"
                  value={form.opdAttendingPhysician}
                  onChange={handleChange}
                  className={field}
                >
                  <option value="">Select physician</option>
                  {physicians.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
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

              <div>
                <label className={labelCls}>Admitting Physician</label>
                <select
                  name="admittingPhysician"
                  value={form.admittingPhysician}
                  onChange={handleChange}
                  className={field}
                >
                  <option value="">Select physician</option>
                  {physicians.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Remarks (HAMA/THOC)</label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  rows={2}
                  className={`${field} resize-none`}
                  placeholder="Enter remarks (optional)"
                  maxLength={300}
                />
              </div>
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
