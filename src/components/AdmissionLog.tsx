import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Bookmark,
  BookmarkPlus,
  X,
  Filter,
} from 'lucide-react';
import type { Admission, YesNo } from '../types';
import { formatTime12 } from '../hooks/useAdmissions';
import AdmissionForm from './AdmissionForm';

const VIEWS_KEY = 'opd-ipd-admission-views';
const PENDING_DAYS = 3;

interface SavedView {
  id: string;
  name: string;
  search: string;
  source: string;
  advised: string;
  admitted: string;
  physician: string;
}

interface AdmissionLogProps {
  admissions: Admission[];
  onAdd: (data: Omit<Admission, 'id' | 'createdAt'>) => void | Promise<void>;
  onUpdate: (id: string, data: Partial<Admission>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  physicians: string[];
  isDoctor?: boolean;
  physicianName?: string | null;
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

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveViews(views: SavedView[]) {
  localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
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

const PRESET_VIEWS: { name: string; patch: Partial<Omit<SavedView, 'id' | 'name'>> }[] = [
  { name: 'ER only', patch: { source: 'ER', advised: 'All', admitted: 'All', physician: 'All', search: '' } },
  { name: 'OPD only', patch: { source: 'OPD', advised: 'All', admitted: 'All', physician: 'All', search: '' } },
  { name: 'Advised · not admitted', patch: { source: 'All', advised: 'Yes', admitted: 'No', physician: 'All', search: '' } },
  { name: 'Pending only', patch: { source: 'All', advised: 'All', admitted: 'No', physician: 'All', search: '' } },
];

export default function AdmissionLog({
  admissions,
  onAdd,
  onUpdate,
  onDelete,
  physicians,
  isDoctor = false,
  physicianName = null,
}: AdmissionLogProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Admission | null>(null);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('All');
  const [filterAdvised, setFilterAdvised] = useState('All');
  const [filterAdmitted, setFilterAdmitted] = useState('All');
  const [filterPhysician, setFilterPhysician] = useState('All');
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => loadViews());
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
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
        a.opdAttendingPhysician.toLowerCase().includes(q);

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

  const applyView = (v: Partial<SavedView>) => {
    setSearch(v.search ?? '');
    setFilterSource(v.source ?? 'All');
    setFilterAdvised(v.advised ?? 'All');
    setFilterAdmitted(v.admitted ?? 'All');
    setFilterPhysician(v.physician ?? 'All');
    setIssueFilter('all');
  };

  const clearFilters = () => {
    applyView({
      search: '',
      source: 'All',
      advised: 'All',
      admitted: 'All',
      physician: 'All',
    });
    setIssueFilter('all');
  };

  const handleSaveView = () => {
    const name = saveName.trim();
    if (!name) return;
    const next: SavedView = {
      id: crypto.randomUUID(),
      name,
      search,
      source: filterSource,
      advised: filterAdvised,
      admitted: filterAdmitted,
      physician: filterPhysician,
    };
    const views = [...savedViews, next];
    setSavedViews(views);
    saveViews(views);
    setSaveName('');
    setShowSaveInput(false);
  };

  const handleDeleteView = (id: string) => {
    const views = savedViews.filter((v) => v.id !== id);
    setSavedViews(views);
    saveViews(views);
  };

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

  const hasActiveFilters =
    search ||
    filterSource !== 'All' ||
    filterAdvised !== 'All' ||
    filterAdmitted !== 'All' ||
    filterPhysician !== 'All' ||
    issueFilter === 'issues';

  const emptyHint = !admissions.length
    ? {
        title: 'No admissions yet',
        body: 'Add the first admission to start tracking OPD → IPD conversion.',
        action: 'Add New Admission',
      }
    : {
        title: 'No matching admissions',
        body: hasActiveFilters
          ? 'Try clearing filters or pick a different saved view.'
          : 'Nothing to show for this list.',
        action: hasActiveFilters ? 'Clear filters' : 'Add New Admission',
      };

  const ActionButtons = ({ a }: { a: Admission }) => (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => handleEdit(a)}
        className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-[#1348f3] transition-colors"
        title="Edit"
      >
        <Edit2 size={13} />
      </button>
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
    </div>
  );

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-2">
        <div>
          <h1 className="text-[16px] font-bold text-slate-900 leading-none">Admission Log</h1>
          <p className="text-slate-500 text-[11.5px] mt-0.5">
            {isDoctor && physicianName
              ? `Your patients · ${physicianName}`
              : 'View and manage hospital admissions.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-[#1348f3] text-white text-[12px] font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
        >
          <Plus size={14} />
          Add New Admission
        </button>
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

      {/* Data quality banner */}
      {issueCount > 0 && (
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p>
              <span className="font-semibold">{issueCount}</span> record
              {issueCount === 1 ? '' : 's'} need attention (missing physician/date, advised but not
              admitted after {PENDING_DAYS}+ days, or possible duplicates).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIssueFilter((f) => (f === 'issues' ? 'all' : 'issues'))}
            className="shrink-0 px-2.5 py-1 rounded-md border border-amber-300 bg-white text-amber-800 font-semibold hover:bg-amber-100"
          >
            {issueFilter === 'issues' ? 'Show all' : 'Show issues only'}
          </button>
        </div>
      )}

      {/* Saved views */}
      <div className="shrink-0 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mr-0.5">
          Views
        </span>
        {PRESET_VIEWS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => applyView(p.patch)}
            className="px-2 py-1 text-[10.5px] font-medium rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
          >
            {p.name}
          </button>
        ))}
        {savedViews.map((v) => (
          <span
            key={v.id}
            className="inline-flex items-center gap-0.5 pl-2 pr-1 py-0.5 text-[10.5px] font-medium rounded-md border border-[#1348f3]/30 bg-blue-50 text-[#1348f3]"
          >
            <button type="button" onClick={() => applyView(v)} className="hover:underline">
              {v.name}
            </button>
            <button
              type="button"
              onClick={() => handleDeleteView(v.id)}
              className="p-0.5 rounded hover:bg-blue-100"
              title="Remove view"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {!showSaveInput ? (
          <button
            type="button"
            onClick={() => setShowSaveInput(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10.5px] font-medium rounded-md border border-dashed border-slate-300 text-slate-500 hover:border-[#1348f3] hover:text-[#1348f3]"
          >
            <BookmarkPlus size={12} />
            Save current
          </button>
        ) : (
          <span className="inline-flex items-center gap-1">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="View name"
              maxLength={40}
              className="text-[11px] border border-slate-200 rounded-md px-2 py-1 w-[120px] focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveView();
                if (e.key === 'Escape') {
                  setShowSaveInput(false);
                  setSaveName('');
                }
              }}
            />
            <button
              type="button"
              onClick={handleSaveView}
              className="inline-flex items-center gap-0.5 px-2 py-1 text-[10.5px] font-semibold rounded-md bg-[#1348f3] text-white"
            >
              <Bookmark size={11} />
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSaveInput(false);
                setSaveName('');
              }}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm px-3 py-2 shrink-0">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search patients, diagnosis, complaint, physician..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={80}
              className="w-full pl-8 pr-3 py-2 sm:py-1.5 text-[12px] border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 focus:border-[#1348f3] placeholder:text-slate-400"
            />
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="text-[12px] border border-slate-200 rounded-md px-2 py-2 sm:py-1.5 text-slate-600 bg-white focus:outline-none min-w-0 sm:min-w-[110px]"
            >
              <option value="All">All Sources</option>
              <option value="OPD">OPD</option>
              <option value="ER">ER</option>
              <option value="Direct">Direct</option>
            </select>
            <select
              value={filterAdvised}
              onChange={(e) => setFilterAdvised(e.target.value)}
              className="text-[12px] border border-slate-200 rounded-md px-2 py-2 sm:py-1.5 text-slate-600 bg-white focus:outline-none min-w-0 sm:min-w-[110px]"
            >
              <option value="All">Advised: All</option>
              <option value="Yes">Advised: Yes</option>
              <option value="No">Advised: No</option>
            </select>
            <select
              value={filterAdmitted}
              onChange={(e) => setFilterAdmitted(e.target.value)}
              className="text-[12px] border border-slate-200 rounded-md px-2 py-2 sm:py-1.5 text-slate-600 bg-white focus:outline-none min-w-0 sm:min-w-[120px]"
            >
              <option value="All">Admitted: All</option>
              <option value="Yes">Admitted: Yes</option>
              <option value="No">Admitted: No</option>
            </select>
            <select
              value={filterPhysician}
              onChange={(e) => setFilterPhysician(e.target.value)}
              className="text-[12px] border border-slate-200 rounded-md px-2 py-2 sm:py-1.5 text-slate-600 bg-white focus:outline-none col-span-2 sm:col-span-1 min-w-0 sm:min-w-[150px]"
            >
              <option value="All">All Physicians</option>
              {physicianOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-1 px-2 py-2 sm:py-1.5 text-[11px] font-medium text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50 col-span-2 sm:col-span-1"
              >
                <Filter size={12} />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 text-center">
            <p className="text-[13px] font-semibold text-slate-700">{emptyHint.title}</p>
            <p className="text-[11.5px] text-slate-500 mt-1 max-w-sm">{emptyHint.body}</p>
            <button
              type="button"
              onClick={() => {
                if (hasActiveFilters && admissions.length) clearFilters();
                else {
                  setEditing(null);
                  setIsFormOpen(true);
                }
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1348f3] text-white text-[12px] font-semibold rounded-md hover:bg-blue-700"
            >
              {emptyHint.action}
            </button>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden overflow-auto flex-1 p-2 space-y-2">
              {filtered.map((a) => {
                const issues = issueMap.get(a.id);
                return (
                  <div
                    key={a.id}
                    className={`rounded-md border p-3 ${
                      issues?.kinds.length
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-slate-200 bg-white'
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
                      OPD: {a.opdAttendingPhysician || '—'}
                    </p>
                    {!!issues?.labels.length && (
                      <p className="mt-1.5 text-[10px] font-medium text-amber-800 flex items-center gap-1">
                        <AlertTriangle size={11} />
                        {issues.labels.join(' · ')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-auto flex-1">
              <table className="w-full text-[11.5px]">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-3 py-2 font-semibold text-[10px] w-6" />
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
                  {filtered.map((a) => {
                    const issues = issueMap.get(a.id);
                    const hasIssue = !!issues?.kinds.length;
                    return (
                      <tr
                        key={a.id}
                        className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${
                          hasIssue ? 'bg-amber-50/50' : ''
                        }`}
                        title={issues?.labels.join(' · ') || undefined}
                      >
                        <td className="px-2 py-1.5 text-center">
                          {hasIssue && (
                            <AlertTriangle
                              size={12}
                              className="text-amber-500 inline-block"
                              aria-label={issues?.labels.join(', ')}
                            />
                          )}
                        </td>
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
                            <p className="text-[11px]">{a.dateOfAdmission || '—'}</p>
                            <p className="text-[9.5px] text-slate-400">
                              {formatTime12(a.timeOfAdmission)}
                            </p>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                          {a.opdAttendingPhysician || (
                            <span className="text-amber-600 font-medium">Missing</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                          {a.admittingPhysician || '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-end">
                            <ActionButtons a={a} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="px-3 py-1.5 border-t border-slate-100 text-[11px] text-slate-500 shrink-0 flex items-center justify-between gap-2">
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
        isOpen={isFormOpen}
        onClose={handleClose}
        onSave={handleSave}
        initialData={editing}
        physicians={physicians}
      />
    </div>
  );
}
