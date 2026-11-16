import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Stethoscope, KeyRound } from 'lucide-react';
import type { Physician, PhysicianStaffType, PhysicianWriteFields } from '../types';
import { DEPARTMENTS, HOUSE_PHYSICIAN_DEPARTMENTS, PHYSICIAN_STAFF_TYPES } from '../types';
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
  const [search, setSearch] = useState('');

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
  const [addOpen, setAddOpen] = useState(false);

  const houseDeptSet = useMemo(
    () => new Set(HOUSE_PHYSICIAN_DEPARTMENTS as readonly string[]),
    []
  );

  const departmentsInUse = useMemo(() => {
    const set = new Set<string>([
      ...physicians.map((p) => p.department).filter(Boolean),
      ...HOUSE_PHYSICIAN_DEPARTMENTS,
    ]);
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [physicians]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filteringHouseDept = deptFilter !== 'All' && houseDeptSet.has(deptFilter);
    return physicians.filter((p) => {
      const staff = p.staffType || 'Active';
      if (deptFilter !== 'All' && p.department !== deptFilter) return false;
      // "All clinical" = Active + Visiting only, unless a House dept is selected
      if (staffFilter === 'All') {
        if (staff === 'House Physician' && !filteringHouseDept) return false;
      } else if (staff !== staffFilter) {
        return false;
      }
      if (q) {
        const hay = `${p.name} ${p.department} ${p.specialization || ''} ${p.subSpecialization || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [physicians, deptFilter, staffFilter, search, houseDeptSet]);

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
    const isHouseDept = (HOUSE_PHYSICIAN_DEPARTMENTS as readonly string[]).includes(newDept);
    const staffType: PhysicianStaffType =
      isHouseDept || newStaffType === 'House Physician' ? 'House Physician' : newStaffType;
    let account: DoctorAccountAction | null = null;
    if (createLogin && canManageAccounts && staffType !== 'House Physician') {
      account = buildAccount(true, 'create', loginEmail, loginPassword);
      if (createLogin && !account) return;
    }
    setSaving(true);
    try {
      await onAdd(
        {
          name: newName.trim(),
          department: newDept,
          staffType,
          specialization: newSpec.trim(),
          subSpecialization: newSubSpec.trim(),
        },
        account
      );
      setNewName('');
      setNewSpec('');
      setNewSubSpec('');
      setNewStaffType('Active');
      setNewDept(DEPARTMENTS[0]);
      setLoginEmail('');
      setLoginPassword('');
      setCreateLogin(false);
      // Show the roster where the new row lives
      if (staffType === 'House Physician') {
        setStaffFilter('House Physician');
        setDeptFilter(newDept);
      } else {
        setStaffFilter('All');
        setDeptFilter('All');
      }
      showMsg(
        account
          ? 'Physician added and login created'
          : staffType === 'House Physician'
            ? 'House physician added — list filtered to House Physician'
            : 'Physician added'
      );
      setAddOpen(false);
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
      <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <h1 className="text-[16px] font-bold text-slate-900 leading-none">Physicians</h1>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {message && (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
              {message}
            </span>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-8 w-[140px] px-2.5 text-[11px] border border-slate-200 rounded-md bg-white focus:outline-none"
          />
          <select
            className="h-8 text-[11px] border border-slate-200 rounded-md px-2.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30"
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value as 'All' | PhysicianStaffType)}
          >
            <option value="All">All clinical</option>
            <option value="Active">Active</option>
            <option value="Visiting">Visiting</option>
            <option value="House Physician">House Physician</option>
          </select>
          <select
            className="h-8 text-[11px] border border-slate-200 rounded-md px-2.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 max-w-[140px]"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            {departmentsInUse.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All departments' : d}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[11px] font-semibold text-white bg-[#1348f3] rounded-md hover:bg-blue-700"
          >
            <Plus size={14} />
            Add physician
          </button>
        </div>
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

      {/* Add physician modal */}
      {addOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Close"
            onClick={() => !saving && setAddOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-1.5">
                <Stethoscope size={14} className="text-[#1348f3]" />
                <h2 className="text-[13px] font-semibold text-slate-800">Add physician</h2>
              </div>
              <button
                type="button"
                onClick={() => !saving && setAddOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
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
            <label className={label}>Staff type</label>
            <select
              className={field}
              value={newStaffType}
              onChange={(e) => {
                const t = e.target.value as PhysicianStaffType;
                setNewStaffType(t);
                if (t === 'House Physician') setNewDept(HOUSE_PHYSICIAN_DEPARTMENTS[0]);
                else if ((HOUSE_PHYSICIAN_DEPARTMENTS as readonly string[]).includes(newDept))
                  setNewDept(DEPARTMENTS[0]);
              }}
            >
              {PHYSICIAN_STAFF_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>
              Department
              {newStaffType === 'House Physician' ? (
                <span className="text-amber-700 font-normal"> — House units</span>
              ) : null}
            </label>
            <select
              className={field}
              value={newDept}
              onChange={(e) => {
                const d = e.target.value;
                setNewDept(d);
                if ((HOUSE_PHYSICIAN_DEPARTMENTS as readonly string[]).includes(d)) {
                  setNewStaffType('House Physician');
                }
              }}
            >
              {newStaffType === 'House Physician' ? (
                <>
                  <option value="ROD">ROD</option>
                  <option value="IM JCON">IM JCON</option>
                  <option value="PEDIA JCON">PEDIA JCON</option>
                  <option value="OB JCON">OB JCON</option>
                </>
              ) : (
                <>
                  <optgroup label="Clinical departments">
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="House Physician units">
                    <option value="ROD">ROD</option>
                    <option value="IM JCON">IM JCON</option>
                    <option value="PEDIA JCON">PEDIA JCON</option>
                    <option value="OB JCON">OB JCON</option>
                  </optgroup>
                </>
              )}
            </select>
            {newStaffType === 'House Physician' && (
              <p className="text-[10px] text-amber-700/80 mt-0.5">
                Choose ROD, IM JCON, PEDIA JCON, or OB JCON
              </p>
            )}
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
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between gap-2 px-1 py-2 shrink-0">
          <p className="text-[11px] text-slate-400">
            {filtered.length} physician{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-[11.5px]">
            <thead className="sticky top-0 bg-white">
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
                    <tr
                      key={p.id}
                      className={`border-b border-slate-100 align-top ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      } hover:bg-blue-50/40`}
                    >
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
                            {(editStaffType === 'House Physician'
                              ? HOUSE_PHYSICIAN_DEPARTMENTS
                              : DEPARTMENTS
                            ).map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                            {editDept &&
                              !(
                                editStaffType === 'House Physician'
                                  ? (HOUSE_PHYSICIAN_DEPARTMENTS as readonly string[])
                                  : (DEPARTMENTS as readonly string[])
                              ).includes(editDept) && (
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
                            onChange={(e) => {
                              const t = e.target.value as PhysicianStaffType;
                              setEditStaffType(t);
                              if (t === 'House Physician') {
                                setEditDept(HOUSE_PHYSICIAN_DEPARTMENTS[0]);
                              } else if (
                                (HOUSE_PHYSICIAN_DEPARTMENTS as readonly string[]).includes(editDept)
                              ) {
                                setEditDept(DEPARTMENTS[0]);
                              }
                            }}
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
                                : staff === 'House Physician'
                                  ? 'text-amber-800 bg-amber-50'
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
