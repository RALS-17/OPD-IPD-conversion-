import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Stethoscope, KeyRound } from 'lucide-react';
import type { Physician, PhysicianStaffType, PhysicianWriteFields } from '../types';
import { DEPARTMENTS, PHYSICIAN_STAFF_TYPES } from '../types';
import type { DoctorAccountAction } from '../hooks/usePhysicians';

interface PhysiciansProps {
  physicians: Physician[];
  loginLinked?: Record<string, string>;
  onAdd: (
    fields: PhysicianWriteFields,
    account?: DoctorAccountAction | null
  ) => void | Promise<void>;
  onEdit: (
    id: string,
    fields: PhysicianWriteFields,
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
  const [staffFilter, setStaffFilter] = useState<'All' | PhysicianStaffType>('All');

  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState<string>(DEPARTMENTS[0]);
  const [newStaffType, setNewStaffType] = useState<PhysicianStaffType>('Active');
  const [newSpec, setNewSpec] = useState('');
  const [newSubSpec, setNewSubSpec] = useState('');
  const [createLogin, setCreateLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editStaffType, setEditStaffType] = useState<PhysicianStaffType>('Active');
  const [editSpec, setEditSpec] = useState('');
  const [editSubSpec, setEditSubSpec] = useState('');
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
    return physicians.filter((p) => {
      if (deptFilter !== 'All' && p.department !== deptFilter) return false;
      if (staffFilter !== 'All' && (p.staffType || 'Active') !== staffFilter) return false;
      return true;
    });
  }, [physicians, deptFilter, staffFilter]);

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
      await onAdd(
        {
          name: newName.trim(),
          department: newDept,
          staffType: newStaffType,
          specialization: newSpec.trim(),
          subSpecialization: newSubSpec.trim(),
        },
        account
      );
      setNewName('');
      setNewSpec('');
      setNewSubSpec('');
      setNewStaffType('Active');
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
    setEditStaffType(p.staffType || 'Active');
    setEditSpec(p.specialization || '');
    setEditSubSpec(p.subSpecialization || '');
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
      await onEdit(
        editingId,
        {
          name: editName.trim(),
          department: editDept,
          staffType: editStaffType,
          specialization: editSpec.trim(),
          subSpecialization: editSubSpec.trim(),
        },
        account
      );
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
            Roster with Active / Visiting, specialization, and optional doctor login.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
          <div>
            <label className={label}>Staff type</label>
            <select
              className={field}
              value={newStaffType}
              onChange={(e) => setNewStaffType(e.target.value as PhysicianStaffType)}
            >
              {PHYSICIAN_STAFF_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Specialization</label>
            <input
              className={field}
              placeholder="e.g. Cardiology"
              value={newSpec}
              onChange={(e) => setNewSpec(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Sub-specialization</label>
            <input
              className={field}
              placeholder="e.g. Interventional Cardiology"
              value={newSubSpec}
              onChange={(e) => setNewSubSpec(e.target.value)}
              maxLength={160}
            />
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
          <p className="text-[11px] text-slate-500">
            {filtered.length} physician{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-slate-500">Staff</label>
              <select
                className="text-[11px] border border-slate-200 rounded-md px-2 py-1 bg-white"
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value as 'All' | PhysicianStaffType)}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Visiting">Visiting</option>
              </select>
            </div>
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
        </div>

        <div className="overflow-auto flex-1 min-h-0 border border-slate-100 rounded-md">
          <table className="w-full text-[11.5px]">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-3 py-1.5 font-semibold text-[10px]">#</th>
                <th className="px-3 py-1.5 font-semibold text-[10px]">Physician</th>
                <th className="px-3 py-1.5 font-semibold text-[10px]">Department</th>
                <th className="px-3 py-1.5 font-semibold text-[10px]">Staff</th>
                <th className="px-3 py-1.5 font-semibold text-[10px]">Specialization</th>
                <th className="px-3 py-1.5 font-semibold text-[10px]">Login</th>
                <th className="px-3 py-1.5 font-semibold text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    No physicians yet
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => {
                  const hasLogin = Boolean(loginLinked[p.id]);
                  const isEditing = editingId === p.id;
                  const staff = p.staffType || 'Active';
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
                            {editDept && !DEPARTMENTS.includes(editDept as (typeof DEPARTMENTS)[number]) && (
                              <option value={editDept}>{editDept}</option>
                            )}
                          </select>
                        ) : (
                          <span className="text-slate-600">{p.department || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {isEditing ? (
                          <select
                            className={field}
                            value={editStaffType}
                            onChange={(e) =>
                              setEditStaffType(e.target.value as PhysicianStaffType)
                            }
                          >
                            {PHYSICIAN_STAFF_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              staff === 'Active'
                                ? 'text-emerald-700 bg-emerald-50'
                                : 'text-violet-700 bg-violet-50'
                            }`}
                          >
                            {staff}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 min-w-[140px]">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              className={field}
                              placeholder="Specialization"
                              value={editSpec}
                              onChange={(e) => setEditSpec(e.target.value)}
                              maxLength={120}
                            />
                            <input
                              className={field}
                              placeholder="Sub-specialization"
                              value={editSubSpec}
                              onChange={(e) => setEditSubSpec(e.target.value)}
                              maxLength={160}
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-slate-700">{p.specialization || '—'}</p>
                            {p.subSpecialization && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {p.subSpecialization}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {hasLogin ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Linked
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {isEditing ? (
                          <div className="inline-flex flex-col items-end gap-1">
                            {canManageAccounts && (
                              <label className="flex items-center gap-1 text-[10px] text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={editAccountOn}
                                  onChange={(e) => setEditAccountOn(e.target.checked)}
                                  className="rounded border-slate-300"
                                />
                                Login
                              </label>
                            )}
                            {editAccountOn && canManageAccounts && (
                              <div className="text-left space-y-1 w-44">
                                <select
                                  className={field}
                                  value={editMode}
                                  onChange={(e) =>
                                    setEditMode(e.target.value as 'create' | 'link')
                                  }
                                >
                                  <option value="create">Create account</option>
                                  <option value="link">Link existing</option>
                                </select>
                                <input
                                  className={field}
                                  placeholder="Email"
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                />
                                {editMode === 'create' && (
                                  <input
                                    className={field}
                                    placeholder="Password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                  />
                                )}
                              </div>
                            )}
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={saving}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Save"
                              >
                                <Save size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(p)}
                              className="p-1 text-slate-500 hover:text-[#1348f3] hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Remove ${p.name} from roster?`)) onDelete(p.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 size={13} />
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
