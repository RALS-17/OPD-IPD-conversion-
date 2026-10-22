import { useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import type { Admission } from '../types';
import { formatTime12 } from '../hooks/useAdmissions';
import AdmissionForm from './AdmissionForm';

interface AdmissionLogProps {
  admissions: Admission[];
  onAdd: (data: Omit<Admission, 'id' | 'createdAt'>) => void | Promise<void>;
  onUpdate: (id: string, data: Partial<Admission>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  physicians: string[];
}

export default function AdmissionLog({
  admissions,
  onAdd,
  onUpdate,
  onDelete,
  physicians,
}: AdmissionLogProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Admission | null>(null);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const filtered = admissions.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(search.toLowerCase()) ||
      a.diagnosis.toLowerCase().includes(search.toLowerCase()) ||
      a.opdAttendingPhysician.toLowerCase().includes(search.toLowerCase());
    const matchesSource = filterSource === 'All' || a.source === filterSource;
    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Admitted' && a.actuallyAdmitted === 'Yes') ||
      (filterStatus === 'Pending' && a.actuallyAdmitted === 'No');
    return matchesSearch && matchesSource && matchesStatus;
  });

  const handleEdit = (admission: Admission) => {
    setEditing(admission);
    setIsFormOpen(true);
  };

  const handleSave = (data: Omit<Admission, 'id' | 'createdAt'>) => {
    if (editing) {
      onUpdate(editing.id, data);
    } else {
      onAdd(data);
    }
    setEditing(null);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0">
      {/* Header - compact */}
      <div className="flex items-center justify-between shrink-0 gap-3">
        <div>
          <h1 className="text-[16px] font-bold text-slate-900 leading-none">Admission Log</h1>
          <p className="text-slate-500 text-[11.5px] mt-0.5">
            View and manage all hospital admissions.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1348f3] text-white text-[12px] font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={14} />
          Add New Admission
        </button>
      </div>

      {/* Filters - compact */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm px-3 py-2 shrink-0">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search patients, diagnosis, physician..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={80}
              className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 focus:border-[#1348f3] placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="text-[12px] border border-slate-200 rounded-md px-2 py-1.5 text-slate-600 bg-white focus:outline-none min-w-[110px]"
            >
              <option value="All">All Sources</option>
              <option value="ER">ER</option>
              <option value="OPD">OPD</option>
              <option value="Direct">Direct</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-[12px] border border-slate-200 rounded-md px-2 py-1.5 text-slate-600 bg-white focus:outline-none min-w-[110px]"
            >
              <option value="All">All Status</option>
              <option value="Admitted">Admitted</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table - compact */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-[11.5px]">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-3 py-2 font-semibold text-[10px]">Patient Name</th>
                <th className="px-2 py-2 font-semibold text-[10px]">Old/New</th>
                <th className="px-2 py-2 font-semibold text-[10px]">HMO/CASH</th>
                <th className="px-2 py-2 font-semibold text-[10px]">Type</th>
                <th className="px-2 py-2 font-semibold text-[10px]">Source</th>
                <th className="px-2 py-2 font-semibold text-[10px]">Chief Complaint</th>
                <th className="px-2 py-2 font-semibold text-[10px]">Diagnosis</th>
                <th className="px-2 py-2 font-semibold text-[10px]">Advised</th>
                <th className="px-2 py-2 font-semibold text-[10px]">Admitted</th>
                <th className="px-2 py-2 font-semibold text-[10px]">Date / Time</th>
                <th className="px-2 py-2 font-semibold text-[10px]">OPD Physician</th>
                <th className="px-2 py-2 font-semibold text-[10px]">Admitting</th>
                <th className="px-2 py-2 font-semibold text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-3 py-10 text-center text-slate-400 text-[12px]">
                    No admissions found
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-3 py-1.5">
                      <div>
                        <p className="font-medium text-slate-800 text-[11.5px] leading-tight">
                          {a.patientName}
                        </p>
                        <p className="text-[9.5px] text-slate-400 truncate max-w-[140px] leading-tight">
                          {a.address}
                        </p>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[9.5px] font-semibold ${
                          a.oldNew === 'New'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.oldNew}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[9.5px] font-semibold ${
                          a.hhoCash === 'HHO'
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {a.hhoCash === 'HHO' ? 'HMO' : 'CASH'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[9.5px] font-semibold ${
                          a.patientType === 'Walk-in'
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {a.patientType || 'Private'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-600">{a.source}</td>
                    <td className="px-2 py-1.5 text-slate-600 max-w-[100px] truncate">
                      {a.chiefComplaint}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 max-w-[100px] truncate">
                      {a.diagnosis}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`font-medium ${
                          a.advisedForAdmission === 'Yes'
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {a.advisedForAdmission}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[9.5px] font-semibold ${
                          a.actuallyAdmitted === 'Yes'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {a.actuallyAdmitted === 'Yes' ? 'Admitted' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                      <div className="leading-tight">
                        <p className="text-[11px]">{a.dateOfAdmission}</p>
                        <p className="text-[9.5px] text-slate-400">{formatTime12(a.timeOfAdmission)}</p>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                      {a.opdAttendingPhysician}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                      {a.admittingPhysician || '—'}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => handleEdit(a)}
                          className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-[#1348f3] transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this admission record?')) {
                              onDelete(a.id);
                            }
                          }}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-1.5 border-t border-slate-100 text-[11px] text-slate-500 shrink-0">
          Showing {filtered.length} of {admissions.length} admissions
        </div>
      </div>

      <AdmissionForm
        isOpen={isFormOpen}
        onClose={handleClose}
        onSave={handleSave}
        initialData={editing}
        physicians={physicians}
      />
    </div>
  );
}
