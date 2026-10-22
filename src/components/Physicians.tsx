import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Stethoscope } from 'lucide-react';
import type { Physician } from '../types';
import { DEPARTMENTS } from '../types';

interface PhysiciansProps {
  physicians: Physician[];
  onAdd: (name: string, department: string) => void | Promise<void>;
  onEdit: (id: string, name: string, department: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  usingSupabase: boolean;
  error: string | null;
}

export default function Physicians({
  physicians,
  onAdd,
  onEdit,
  onDelete,
  usingSupabase,
  error,
}: PhysiciansProps) {
  const [deptFilter, setDeptFilter] = useState('All');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState<string>(DEPARTMENTS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [message, setMessage] = useState('');

  const departmentsInUse = useMemo(() => {
    const set = new Set(physicians.map((p) => p.department).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [physicians]);

  const filtered = useMemo(() => {
    if (deptFilter === 'All') return physicians;
    return physicians.filter((p) => p.department === deptFilter);
  }, [physicians, deptFilter]);

  const showMsg = (t: string) => {
    setMessage(t);
    setTimeout(() => setMessage(''), 2500);
  };

  const field =
    'w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 focus:border-[#1348f3]';
  const label = 'block text-[11px] font-medium text-slate-600 mb-0.5';

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await onAdd(newName.trim(), newDept);
    setNewName('');
    showMsg('Physician added');
  };

  const startEdit = (p: Physician) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDept(p.department || DEPARTMENTS[0]);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await onEdit(editingId, editName.trim(), editDept);
    setEditingId(null);
    showMsg('Physician updated');
  };

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0">
      <div className="shrink-0 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[16px] font-bold text-slate-900 leading-none">Physicians</h1>
          <p className="text-slate-500 text-[11.5px] mt-0.5">
            Manage doctor roster and departments (saved in database).
          </p>
        </div>
        {message && (
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
            {message}
          </span>
        )}
      </div>

      {!usingSupabase && (
        <div className="shrink-0 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
          Supabase is not configured. Set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>, run the physicians SQL, then
          restart the app.
        </div>
      )}
      {error && (
        <div className="shrink-0 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Add form */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm p-3 shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <Stethoscope size={14} className="text-[#1348f3]" />
          <h2 className="text-[12.5px] font-semibold text-slate-800">Add physician</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-1">
            <label className={label}>Name</label>
            <input
              className={field}
              placeholder="e.g. Dr. Juan Santos"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              maxLength={80}
            />
          </div>
          <div>
            <label className={label}>Department</label>
            <select className={field} value={newDept} onChange={(e) => setNewDept(e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!usingSupabase}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#1348f3] rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Filter + table */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm p-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <p className="text-[11px] text-slate-500">
            {filtered.length} physician{filtered.length !== 1 ? 's' : ''}
            {deptFilter !== 'All' ? ` · ${deptFilter}` : ''}
          </p>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-slate-500">Department</label>
            <select
              className="text-[11px] border border-slate-200 rounded-md px-2 py-1 bg-white"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              {departmentsInUse.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-auto flex-1 min-h-0 border border-slate-100 rounded-md">
          <table className="w-full text-[11.5px]">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-3 py-1.5 font-semibold text-[10px]">#</th>
                <th className="px-3 py-1.5 font-semibold text-[10px]">Physician</th>
                <th className="px-3 py-1.5 font-semibold text-[10px]">Department</th>
                <th className="px-3 py-1.5 font-semibold text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                    No physicians yet
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-1.5">
                      {editingId === p.id ? (
                        <input
                          className={field}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={80}
                        />
                      ) : (
                        <span className="font-medium text-slate-800">{p.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      {editingId === p.id ? (
                        <select
                          className={field}
                          value={editDept}
                          onChange={(e) => setEditDept(e.target.value)}
                        >
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-600">{p.department || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {editingId === p.id ? (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100"
                          >
                            <Save size={11} /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <X size={11} /> Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            className="p-1 text-slate-400 hover:text-[#1348f3] hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete ${p.name}?`)) onDelete(p.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
