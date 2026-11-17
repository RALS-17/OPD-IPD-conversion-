import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
} from 'lucide-react';
import type { Admission, YesNo } from '../types';
import { formatTime12 } from '../hooks/useAdmissions';
import AdmissionForm from './AdmissionForm';

const PENDING_DAYS = 3;

interface AdmissionLogProps {
  admissions: Admission[];
  /** Handlers resolve to false when the save failed (the app already showed a toast) */
  onAdd: (data: Omit<Admission, 'id' | 'createdAt'>) => void | boolean | Promise<void | boolean>;
  onUpdate: (id: string, data: Partial<Admission>) => void | boolean | Promise<void | boolean>;
  onDelete: (id: string) => void | boolean | Promise<void | boolean>;
  physicians: string[];
  housePhysicians?: string[];
  departmentByName?: Record<string, string>;
  physicianMeta?: Record<
    string,
    { staffType?: string; specialization?: string; subSpecialization?: string }
  >;
  isDoctor?: boolean;
  physicianName?: string | null;
  /** admin + admitting staff */
  canAdd?: boolean;
  canEdit?: boolean;
  /** admin only */
  canDelete?: boolean;
}

type IssueKind = 'missing_physician' | 'missing_date' | 'pending_advised' | 'possible_duplicate';

function daysSince(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((start.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

function issuesFor(
  a: Admission,
  all: Admission[]
): { kinds: IssueKind[]; labels: string[] } {
  const kinds: IssueKind[] = [];
  const labels: string[] = [];

  if (!(a.opdAttendingPhysician || '').trim()) {
    kinds.push('missing_physician');
    labels.push('Missing OPD physician');
  }
  if (!(a.dateOfAdmission || '').trim()) {
    kinds.push('missing_date');
    labels.push('Missing date');
  }
  if (a.advisedForAdmission === 'Yes' && a.actuallyAdmitted === 'No') {
    const age = daysSince(a.dateOfAdmission);
    if (age !== null && age >= PENDING_DAYS) {
      kinds.push('pending_advised');
      labels.push(`Advised, not admitted (${age}d)`);
    }
  }

  const nameKey = (a.patientName || '').trim().toLowerCase();
  const dateKey = (a.dateOfAdmission || '').trim();
  if (nameKey && dateKey) {
    const dup = all.some(
      (o) =>
        o.id !== a.id &&
        (o.patientName || '').trim().toLowerCase() === nameKey &&
        (o.dateOfAdmission || '').trim() === dateKey
    );
    if (dup) {
      kinds.push('possible_duplicate');
      labels.push('Possible duplicate');
    }
  }

  return { kinds, labels };
}

export default function AdmissionLog({
  admissions,
  onAdd,
  onUpdate,
  onDelete,
  physicians,
  housePhysicians = [],
  departmentByName = {},
  physicianMeta = {},
  isDoctor = false,
  physicianName = null,
  canAdd = false,
  canEdit = false,
  canDelete = false,
}: AdmissionLogProps) {
  const showActions = canEdit || canDelete;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Admission | null>(null);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('All');
  const [filterAdvised, setFilterAdvised] = useState('All');
  const [filterAdmitted, setFilterAdmitted] = useState('All');
  const [filterPhysician, setFilterPhysician] = useState('All');
  const [issueFilter, setIssueFilter] = useState<'all' | 'issues'>('all');

  const physicianOptions = useMemo(() => {
    const set = new Set<string>();
    physicians.forEach((p) => {
      if (p?.trim()) set.add(p.trim());
    });
    admissions.forEach((a) => {
      if (a.opdAttendingPhysician?.trim()) set.add(a.opdAttendingPhysician.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [physicians, admissions]);

  const issueMap = useMemo(() => {
    const map = new Map<string, { kinds: IssueKind[]; labels: string[] }>();
    admissions.forEach((a) => map.set(a.id, issuesFor(a, admissions)));
    return map;
  }, [admissions]);

  const issueCount = useMemo(
    () => admissions.filter((a) => (issueMap.get(a.id)?.kinds.length || 0) > 0).length,
    [admissions, issueMap]
  );

  const doctorStats = useMemo(() => {
    if (!isDoctor) return null;
    const total = admissions.length;
    const advised = admissions.filter((a) => a.advisedForAdmission === 'Yes').length;
    const admitted = admissions.filter((a) => a.actuallyAdmitted === 'Yes').length;
    const rate = total > 0 ? Math.round((admitted / total) * 1000) / 10 : 0;
    return { total, advised, admitted, rate };
  }, [isDoctor, admissions]);

  const filtered = useMemo(() => {
    return admissions.filter((a) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.patientName.toLowerCase().includes(q) ||
        a.diagnosis.toLowerCase().includes(q) ||
        a.chiefComplaint.toLowerCase().includes(q) ||
        a.opdAttendingPhysician.toLowerCase().includes(q) ||
        (a.admittingPhysician || '').toLowerCase().includes(q) ||
        (a.housePhysician || '').toLowerCase().includes(q);

      const matchesSource = filterSource === 'All' || a.source === filterSource;
      const matchesAdvised =
        filterAdvised === 'All' || a.advisedForAdmission === (filterAdvised as YesNo);
      const matchesAdmitted =
        filterAdmitted === 'All' ||
        (filterAdmitted === 'Yes' && a.actuallyAdmitted === 'Yes') ||
        (filterAdmitted === 'No' && a.actuallyAdmitted === 'No');
      const matchesPhysician =
        filterPhysician === 'All' ||
        (a.opdAttendingPhysician || '').trim() === filterPhysician;

      const hasIssues = (issueMap.get(a.id)?.kinds.length || 0) > 0;
      const matchesIssues = issueFilter === 'all' || hasIssues;

      return (
        matchesSearch &&
        matchesSource &&
        matchesAdvised &&
        matchesAdmitted &&
        matchesPhysician &&
        matchesIssues
      );
    });
  }, [
    admissions,
    search,
    filterSource,
    filterAdvised,
    filterAdmitted,
    filterPhysician,
    issueFilter,
    issueMap,
  ]);

  const clearFilters = () => {
    setSearch('');
    setFilterSource('All');
    setFilterAdvised('All');
    setFilterAdmitted('All');
    setFilterPhysician('All');
    setIssueFilter('all');
  };

  const handleEdit = (admission: Admission) => {
    if (!canEdit) return;
    setEditing(admission);
    setIsFormOpen(true);
  };

  /** Returns false when the save failed so the form stays open with the user's data. */
  const handleSave = async (data: Omit<Admission, 'id' | 'createdAt'>): Promise<boolean> => {
    let ok: void | boolean = true;
    if (editing) {
      if (canEdit) ok = await onUpdate(editing.id, data);
    } else if (canAdd) {
      ok = await onAdd(data);
    }
    if (ok === false) return false;
    setEditing(null);
    return true;
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditing(null);
  };

  const hasActiveFilters =
    search ||
    filterSource !== 'All' ||
    filterAdvised !== 'All' ||
    filterAdmitted !== 'All' ||
    filterPhysician !== 'All' ||
    issueFilter === 'issues';

  const emptyHint: { title: string; body: string; action: string | null } = !admissions.length
    ? {
        title: 'No admissions yet',
        body: canAdd
          ? 'Add the first admission to start tracking OPD → IPD conversion.'
          : 'There are no admissions to show yet.',
        action: canAdd ? 'Add New Admission' : null,
      }
    : {
        title: 'No matching admissions',
        body: hasActiveFilters
          ? 'Try clearing the filters.'
          : 'Nothing to show for this list.',
        action: hasActiveFilters ? 'Clear filters' : canAdd ? 'Add New Admission' : null,
      };

  const ActionButtons = ({ a }: { a: Admission }) => {
    if (!showActions) return null;
    return (
      <div className="flex items-center gap-0.5">
        {canEdit && (
          <button
            type="button"
            onClick={() => handleEdit(a)}
            className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-[#1348f3] transition-colors"
            title="Edit"
          >
            <Edit2 size={13} />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete this admission record?')) onDelete(a.id);
            }}
            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Header: title left, filters + action right */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between shrink-0 gap-2">
        <div>
          <h1 className="text-[16px] font-bold text-slate-900 leading-none">Admission Log</h1>
          {isDoctor && physicianName ? (
            <p className="text-slate-500 text-[11.5px] mt-0.5">Your patients · {physicianName}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <div className="relative">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 w-[140px] pl-7 pr-2 text-[11px] border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30"
            />
          </div>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="h-8 text-[11px] border border-slate-200 rounded-md px-2.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30"
          >
            <option value="All">All sources</option>
            <option value="OPD">Total OPD Consults</option>
            <option value="ER">Total ER seen</option>
            <option value="Direct">Total Direct Admission</option>
          </select>
          <select
            value={filterPhysician}
            onChange={(e) => setFilterPhysician(e.target.value)}
            className="h-8 text-[11px] border border-slate-200 rounded-md px-2.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 max-w-[150px]"
          >
            <option value="All">All doctors</option>
            {physicianOptions.filter((p) => p !== 'All').map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={filterAdvised}
            onChange={(e) => setFilterAdvised(e.target.value)}
            className="h-8 text-[11px] border border-slate-200 rounded-md px-2.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30"
          >
            <option value="All">Advised: All</option>
            <option value="Yes">Advised: Yes</option>
            <option value="No">Advised: No</option>
          </select>
          <select
            value={filterAdmitted}
            onChange={(e) => setFilterAdmitted(e.target.value)}
            className="h-8 text-[11px] border border-slate-200 rounded-md px-2.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30"
          >
            <option value="All">Admitted: All</option>
            <option value="Yes">Admitted: Yes</option>
            <option value="No">Admitted: No</option>
          </select>
          {canAdd && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 h-8 px-3 bg-[#1348f3] text-white text-[11px] font-semibold rounded-md hover:bg-blue-700"
            >
              <Plus size={14} />
              Add New Admission
            </button>
          )}
        </div>
      </div>

      {/* Doctor home strip */}
      {isDoctor && doctorStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
          {[
            { label: 'Your consults', value: doctorStats.total },
            { label: 'Advised', value: doctorStats.advised },
            { label: 'Admitted', value: doctorStats.admitted },
            { label: 'Conversion', value: `${doctorStats.rate}%` },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white border border-slate-200 rounded-md px-2.5 py-2 shadow-sm"
            >
              <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
              <p className="text-[16px] font-bold text-slate-900 leading-tight">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 min-h-0 flex flex-col">
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 text-center">
            <p className="text-[13px] font-semibold text-slate-700">{emptyHint.title}</p>
            <p className="text-[11.5px] text-slate-500 mt-1 max-w-sm">{emptyHint.body}</p>
            {emptyHint.action && (
              <button
                type="button"
                onClick={() => {
                  if (hasActiveFilters && admissions.length) clearFilters();
                  else if (canAdd) {
                    setEditing(null);
                    setIsFormOpen(true);
                  }
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1348f3] text-white text-[12px] font-semibold rounded-md hover:bg-blue-700"
              >
                {emptyHint.action}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden overflow-auto flex-1">
              {filtered.map((a, idx) => {
                const issues = issueMap.get(a.id);
                return (
                  <div
                    key={a.id}
                    className={`px-3 py-2.5 border-b border-slate-100 ${
                      issues?.kinds.length
                        ? 'bg-amber-50/60'
                        : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-[13px] leading-tight truncate">
                          {a.patientName}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {a.dateOfAdmission || 'No date'} · {formatTime12(a.timeOfAdmission)}
                        </p>
                      </div>
                      <ActionButtons a={a} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {a.source}
                      </span>
                      <span
                        className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded ${
                          a.actuallyAdmitted === 'Yes'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {a.actuallyAdmitted === 'Yes' ? 'Admitted' : 'Pending'}
                      </span>
                      <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        Advised: {a.advisedForAdmission}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-600 truncate">
                      {a.diagnosis || a.chiefComplaint || '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                      OPD: {a.opdAttendingPhysician || '—'} · HP: {a.housePhysician || '—'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-auto flex-1">
              <table className="w-full text-[11.5px]">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-left text-slate-400 border-b border-slate-200 uppercase tracking-wide text-[10px]">
                    <th className="px-3 py-2 font-semibold text-[10px] min-w-[140px]">Patient Name</th>
                    <th className="px-2 py-2 font-semibold text-[10px]">HMO/CASH</th>
                    <th className="px-2 py-2 font-semibold text-[10px]">Type</th>
                    <th className="px-2 py-2 font-semibold text-[10px]">Source</th>
                    <th className="px-2 py-2 font-semibold text-[10px]">Chief Complaint</th>
                    <th className="px-2 py-2 font-semibold text-[10px]">Diagnosis</th>
                    <th className="px-2 py-2 font-semibold text-[10px]">Advised</th>
                    <th className="px-2 py-2 font-semibold text-[10px]">Admitted</th>
                    <th className="px-2 py-2 font-semibold text-[10px]">Date / Time</th>
                    <th className="px-2 py-2 font-semibold text-[10px]">OPD Physician</th>
                    <th className="px-2 py-2 font-semibold text-[10px]">Admitting Physician</th>
                    <th className="px-2 py-2 font-semibold text-[10px]">House Physician</th>
                    {showActions && (
                      <th className="px-2 py-2 font-semibold text-[10px] text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, idx) => {
                    const issues = issueMap.get(a.id);
                    const hasIssue = !!issues?.kinds.length;
                    return (
                      <tr
                        key={a.id}
                        className={`border-b border-slate-100 ${
                          hasIssue
                            ? 'bg-amber-50/60'
                            : idx % 2 === 0
                              ? 'bg-white'
                              : 'bg-slate-50'
                        } hover:bg-blue-50/40 transition-colors`}
                        title={issues?.labels.join(' · ') || undefined}
                      >
                        <td className="px-3 py-1.5 max-w-[200px]">
                          <p className="font-medium text-slate-800 text-[11.5px] leading-tight truncate" title={a.patientName}>
                            {a.patientName}
                          </p>
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
                            <p className="text-[11px]">{a.dateOfAdmission || '—'}</p>
                            <p className="text-[9.5px] text-slate-400">
                              {formatTime12(a.timeOfAdmission)}
                            </p>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                          {a.opdAttendingPhysician || (
                            <span className="text-amber-600 font-medium">NA</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                          {a.admittingPhysician || '—'}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                          {a.housePhysician || '—'}
                        </td>
                        {showActions && (
                          <td className="px-2 py-1.5">
                            <div className="flex items-center justify-end">
                              <ActionButtons a={a} />
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="px-1 py-1.5 border-t border-slate-100 text-[11px] text-slate-500 shrink-0 flex items-center justify-between gap-2">
          <span>
            Showing {filtered.length} of {admissions.length} admissions
            {issueFilter === 'issues' ? ' · issues only' : ''}
          </span>
          {issueCount > 0 && (
            <span className="text-amber-700 font-medium">{issueCount} with warnings</span>
          )}
        </div>
      </div>

      <AdmissionForm
        isOpen={isFormOpen && (canAdd || canEdit)}
        onClose={handleClose}
        onSave={handleSave}
        initialData={editing}
        physicians={physicians}
        housePhysicians={housePhysicians}
        departmentByName={departmentByName}
        physicianMeta={physicianMeta}
      />
    </div>
  );
}
