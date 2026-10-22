import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Stethoscope, KeyRound } from 'lucide-react';
import type { Physician } from '../types';
import { DEPARTMENTS } from '../types';
import type { DoctorAccountAction } from '../hooks/usePhysicians';

interface PhysiciansProps {
  physicians: Physician[];
  loginLinked?: Record<string, string>;
  onAdd: (
    name: string,
    department: string,
    account?: DoctorAccountAction | null
  ) => void | Promise<void>;
  onEdit: (
    id: string,
    name: string,
    department: string,
    account?: DoctorAccountAction | null
  ) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  usingSupabase: boolean;
  error: string | null;
  canManageAccounts?: boolean;
}

export default function Physicians({
  physicians,
  loginLinked = {},
  onAdd,
  onEdit,
  onDelete,
  usingSupabase,
  error,
  canManageAccounts = true,
}: PhysiciansProps) {
  const [deptFilter, setDeptFilter] = useState('All');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState<string>(DEPARTMENTS[0]);
  const [createLogin, setCreateLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editAccountOn, setEditAccountOn] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'link'>('create');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

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
    setTimeout(() => setMessage(''), 3000);
  };

  const field =
    'w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 focus:border-[#1348f3]';
  const label = 'block text-[11px] font-medium text-slate-600 mb-0.5';

  const buildAccount = (
    on: boolean,
    mode: 'create' | 'link',
    email: string,
    password: string
  ): DoctorAccountAction | null => {
    if (!on || !canManageAccounts) return null;
    if (!email.trim()) {
      alert('Login email is required.');
      return null;
    }
    if (mode === 'create') {
      if (password.length < 6) {
        alert('Password must be at least 6 characters.');
        return null;
      }
      return { mode: 'create', email: email.trim(), password };
    }
    return { mode: 'link', email: email.trim() };
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    let account: DoctorAccountAction | null = null;
    if (createLogin && canManageAccounts) {
      account = buildAccount(true, 'create', loginEmail, loginPassword);
      if (createLogin && !account) return;
    }
    setSaving(true);
    try {
      await onAdd(newName.trim(), newDept, account);
      setNewName('');
      setLoginEmail('');
      setLoginPassword('');
      setCreateLogin(false);
      showMsg(account ? 'Physician added and login created' : 'Physician added');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p: Physician) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDept(p.department || DEPARTMENTS[0]);
    setEditAccountOn(false);
    setEditMode('create');
    setEditEmail('');
    setEditPassword('');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    let account: DoctorAccountAction | null = null;
    if (editAccountOn && canManageAccounts) {
      account = buildAccount(true, editMode, editEmail, editPassword);
      if (editAccountOn && !account) return;
    }
    setSaving(true);
    try {
      await onEdit(editingId, editName.trim(), editDept, account);
      setEditingId(null);
      showMsg(
        account
          ? account.mode === 'create'
            ? 'Saved and login created'
            : 'Saved and account linked'
          : 'Physician updated'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0">
      <div className="shrink-0 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[16px] font-bold text-slate-900 leading-none">Physicians</h1>
          <p className="text-slate-500 text-[11.5px] mt-0.5">
            Manage roster. Create or link doctor logins on add or edit (admin).
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
          Supabase is not configured. Set env keys and run schema SQL first.
        </div>
      )}
      {error && (
        <div className="shrink-0 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Add */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm p-3 shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <Stethoscope size={14} className="text-[#1348f3]" />
          <h2 className="text-[12.5px] font-semibold text-slate-800">Add physician</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={label}>Name</label>
            <input
              className={field}
              placeholder="e.g. Dr. Juan Santos"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
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
        </div>

        {canManageAccounts && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createLogin}
                onChange={(e) => setCreateLogin(e.target.checked)}
                className="rounded border-slate-300 text-[#1348f3]"
              />
              <KeyRound size={13} className="text-slate-500" />
              <span className="text-[12px] font-medium text-slate-700">
                Create doctor login account
              </span>
            </label>
            {createLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div>
                  <label className={label}>Login email</label>
                  <input
                    type="email"
                    className={field}
                    placeholder="dr.santos@gcmcc.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className={label}>Temporary password</label>
                  <input
                    type="text"
                    className={field}
                    placeholder="Min. 6 characters"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    maxLength={128}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-3">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!usingSupabase || saving || !newName.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#1348f3] rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={12} /> {saving ? 'Saving…' : 'Add physician'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm p-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <p className="text-[11px] text-slate-500">
            {filtered.length} physician{filtered.length !== 1 ? 's' : ''}
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
                <th className="px-3 py-1.5 font-semibold text-[10px]">Login</th>
                <th className="px-3 py-1.5 font-semibold text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    No physicians yet
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => {
                  const hasLogin = Boolean(loginLinked[p.id]);
                  const isEditing = editingId === p.id;
                  return (
                    <tr key={p.id} className="border-b border-slate-50 align-top">
                      <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-1.5">
                        {isEditing ? (
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
                        {isEditing ? (
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
                      <td className="px-3 py-1.5">
                        {hasLogin ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Linked
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {isEditing ? (
                          <div className="flex flex-col items-end gap-2 min-w-[200px]">
                            {canManageAccounts && (
                              <div className="w-full text-left border border-slate-100 rounded-md p-2 bg-slate-50/80">
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={editAccountOn}
                                    onChange={(e) => setEditAccountOn(e.target.checked)}
                                  />
                                  <KeyRound size={12} />
                                  {hasLogin ? 'Re-link / create login' : 'Create or link login'}
                                </label>
                                {editAccountOn && (
                                  <div className="mt-2 space-y-1.5">
                                    <div className="flex gap-2 text-[11px]">
                                      <label className="flex items-center gap-1">
                                        <input
                                          type="radio"
                                          name={`acct-${p.id}`}
                                          checked={editMode === 'create'}
                                          onChange={() => setEditMode('create')}
                                        />
                                        Create new
                                      </label>
                                      <label className="flex items-center gap-1">
                                        <input
                                          type="radio"
                                          name={`acct-${p.id}`}
                                          checked={editMode === 'link'}
                                          onChange={() => setEditMode('link')}
                                        />
                                        Link existing
                                      </label>
                                    </div>
                                    <input
                                      type="email"
                                      className={field}
                                      placeholder="Email"
                                      value={editEmail}
                                      onChange={(e) => setEditEmail(e.target.value)}
                                      maxLength={120}
                                    />
                                    {editMode === 'create' && (
                                      <input
                                        type="text"
                                        className={field}
                                        placeholder="Temp password (min 6)"
                                        value={editPassword}
                                        onChange={(e) => setEditPassword(e.target.value)}
                                        maxLength={128}
                                      />
                                    )}
                                    {editMode === 'link' && (
                                      <p className="text-[9.5px] text-slate-400">
                                        User must already exist in Supabase Auth.
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={saving}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
