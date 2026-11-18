import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Target,
  Database,
  Download,
  Sun,
  Moon,
  ScrollText,
  UserCircle,
  KeyRound,
  Activity,
} from 'lucide-react';
import { fetchAuditLogs, type AuditEntry } from '../lib/auditLog';
import { toast } from '../lib/toast';
import type { AppSettings, UserRole } from '../types';

export interface AccountInfo {
  fullName: string;
  email: string;
  role: UserRole;
  /** Roster name this login is linked to (doctors) */
  physicianName: string | null;
  physicianDepartment?: string;
}

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  onExportCsv: () => void;
  /** Admission records this user is allowed to see */
  admissionCount: number;
  isAdmin: boolean;
  account: AccountInfo;
  onChangePassword: (
    newPassword: string
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Shown to admins only */
  systemInfo?: { physicians: number; dailyEntries: number; databaseConnected: boolean };
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrator',
  staff: 'Admitting Staff',
  doctor: 'Doctor',
};

const ROLE_ACCESS: Record<UserRole, string> = {
  admin: 'Full access: dashboard, admission log, physician summary, physicians, settings.',
  staff: 'Can add and edit admissions. Cannot delete records or open the dashboard.',
  doctor: 'View-only access to your own patients and your own performance.',
};

function csvCell(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export default function Settings({
  settings,
  onUpdate,
  onResetSettings,
  onExportCsv,
  admissionCount,
  isAdmin,
  account,
  onChangePassword,
  systemInfo,
}: SettingsProps) {
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [auditAction, setAuditAction] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditRows, setAuditRows] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setAuditLoading(true);
    fetchAuditLogs(80)
      .then(setAuditRows)
      .finally(() => setAuditLoading(false));
  }, [isAdmin, admissionCount]);

  const showMsg = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  };

  const initials =
    (account.fullName || account.email || '?')
      .replace(/^Dr\.?\s+/i, '')
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('The two passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await onChangePassword(newPassword);
      if (res.ok) {
        setNewPassword('');
        setConfirmPassword('');
        toast.success('Password changed. Use the new password next time you sign in.');
      } else {
        toast.error(`Could not change the password.\n${res.message}`);
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const shownAudit = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditRows.filter((r) => {
      if (auditAction !== 'all' && r.action !== auditAction) return false;
      if (!q) return true;
      return `${r.summary} ${r.actorName} ${r.actorEmail}`.toLowerCase().includes(q);
    });
  }, [auditRows, auditAction, auditSearch]);

  const exportAuditCsv = () => {
    const rows = shownAudit.map((r) =>
      [new Date(r.createdAt).toLocaleString(), r.action, r.actorName, r.actorEmail, r.summary]
        .map(csvCell)
        .join(',')
    );
    const csv = ['When,Action,Name,Email,Summary', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const field =
    'w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 focus:border-[#1348f3]';
  const label = 'block text-[11px] font-medium text-slate-600 mb-0.5';
  const card = 'bg-white rounded-md border border-slate-200 shadow-sm';

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0 overflow-y-auto">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-bold text-slate-900 leading-none">Settings</h1>
          <p className="text-slate-500 text-[11.5px] mt-0.5">
            Your account, hospital profile, conversion targets, and data tools.
          </p>
        </div>
        {message && (
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
            {message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {/* My Account */}
        <div className={`${card} p-3 lg:col-span-2`}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <UserCircle size={14} className="text-[#1348f3]" />
            <h2 className="text-[12.5px] font-semibold text-slate-800">My Account</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[13px] font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0 text-[11.5px] space-y-0.5">
                <p className="text-[13px] font-semibold text-slate-900 truncate">
                  {account.fullName || '—'}
                </p>
                <p className="text-slate-500 truncate">{account.email || '—'}</p>
                <p>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-[#1348f3] text-[10px] font-semibold">
                    {ROLE_LABEL[account.role]}
                  </span>
                </p>
                {account.role === 'doctor' && (
                  <p className="text-slate-600">
                    Linked physician:{' '}
                    {account.physicianName ? (
                      <strong>
                        {account.physicianName}
                        {account.physicianDepartment ? ` · ${account.physicianDepartment}` : ''}
                      </strong>
                    ) : (
                      <span className="text-amber-600 font-medium">
                        not linked yet — ask an administrator to link your account, otherwise you
                        will see no records
                      </span>
                    )}
                  </p>
                )}
                <p className="text-[10.5px] text-slate-400 pt-0.5">{ROLE_ACCESS[account.role]}</p>
              </div>
            </div>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleChangePassword();
              }}
            >
              <div className="flex items-center gap-1.5">
                <KeyRound size={13} className="text-slate-500" />
                <p className="text-[11.5px] font-semibold text-slate-700">Change password</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="password"
                  autoComplete="new-password"
                  className={field}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  className={field}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={savingPassword || !newPassword || !confirmPassword}
                className="px-3 py-1.5 text-[11px] font-semibold text-white bg-[#1348f3] rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPassword ? 'Saving…' : 'Update password'}
              </button>
            </form>
          </div>
        </div>

        {/* Hospital Profile */}
        <fieldset disabled={!isAdmin} className="m-0 min-w-0 border-0 p-0">
        <div className={`${card} p-3`}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Building2 size={14} className="text-[#1348f3]" />
            <h2 className="text-[12.5px] font-semibold text-slate-800">Hospital Profile</h2>
          </div>
          <div className="space-y-2">
            <div>
              <label className={label}>Hospital Name</label>
              <input
                className={field}
                value={settings.hospitalName}
                onChange={(e) => onUpdate({ hospitalName: e.target.value })}
                maxLength={80}
              />
            </div>
            <div>
              <label className={label}>Branch / Location</label>
              <input
                className={field}
                value={settings.branch}
                onChange={(e) => onUpdate({ branch: e.target.value })}
                maxLength={60}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Shown in the header and sidebar for every user.{' '}
              {isAdmin ? 'Changes are saved for all users.' : 'Only an administrator can change this.'}
            </p>
          </div>
        </div>

        </fieldset>

        {/* Conversion Targets */}
        <fieldset disabled={!isAdmin} className="m-0 min-w-0 border-0 p-0">
        <div className={`${card} p-3`}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Target size={14} className="text-[#0d9f6e]" />
            <h2 className="text-[12.5px] font-semibold text-slate-800">Conversion Targets</h2>
          </div>
          <div className="space-y-2">
            <div>
              <label className={label}>Target Conversion Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                className={field}
                value={settings.targetConversion}
                onChange={(e) => {
                  const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                  onUpdate({ targetConversion: v });
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Good threshold ≥ (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={field}
                  value={settings.goodThreshold}
                  onChange={(e) => {
                    const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                    onUpdate({ goodThreshold: v });
                  }}
                />
              </div>
              <div>
                <label className={label}>Average threshold ≥ (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={field}
                  value={settings.averageThreshold}
                  onChange={(e) => {
                    const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                    onUpdate({ averageThreshold: v });
                  }}
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Green ≥ {settings.goodThreshold}% · Yellow ≥ {settings.averageThreshold}% · Red
              below
            </p>
            {settings.averageThreshold > settings.goodThreshold && (
              <p className="text-[10.5px] text-amber-600 font-medium">
                The Average threshold is higher than the Good threshold, so no physician can be
                rated Yellow. Set Average lower than Good.
              </p>
            )}
          </div>
        </div>


        </fieldset>

        {!isAdmin && (
          <p className="lg:col-span-2 text-[11px] text-slate-500">
            Hospital profile and targets can only be changed by an administrator.
          </p>
        )}

        {/* Appearance */}
        <div className={`${card} p-3 lg:col-span-2`}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sun size={14} className="text-amber-500" />
            <h2 className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">Appearance</h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            Choose light or dark theme for the whole system.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onUpdate({ theme: 'light' });
                showMsg('Light theme applied');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md border ${
                settings.theme === 'light' || !settings.theme
                  ? 'bg-[#1348f3] text-white border-[#1348f3]'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
              }`}
            >
              <Sun size={12} /> Light
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({ theme: 'dark' });
                showMsg('Dark theme applied');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md border ${
                settings.theme === 'dark'
                  ? 'bg-[#1348f3] text-white border-[#1348f3]'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
              }`}
            >
              <Moon size={12} /> Dark
            </button>
          </div>
        </div>

        {/* Data Tools */}
        <div className={`${card} p-3 lg:col-span-2`}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Database size={14} className="text-amber-600" />
            <h2 className="text-[12.5px] font-semibold text-slate-800">Data Tools</h2>
          </div>
          <p className="text-[11px] text-slate-500 mb-2">
            {account.role === 'doctor'
              ? `${admissionCount} of your admission record${admissionCount !== 1 ? 's' : ''}`
              : `${admissionCount} admission record${admissionCount !== 1 ? 's' : ''} in the system`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                onExportCsv();
                showMsg('CSV exported');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-white border border-slate-200 rounded-md hover:bg-slate-50"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            The export contains only the records you are allowed to see.
          </p>
          <p className="text-[10px] text-slate-400 mt-2">
            Physician roster is managed under the <strong>Physicians</strong> menu (database).
          </p>
        </div>
      </div>


      {isAdmin && systemInfo && (
        <div className={`${card} p-3`}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Activity size={14} className="text-emerald-600" />
            <h2 className="text-[12.5px] font-semibold text-slate-800">System overview</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
            {[
              ['Database', systemInfo.databaseConnected ? 'Connected' : 'Not configured'],
              ['Admission records', String(admissionCount)],
              ['Active physicians', String(systemInfo.physicians)],
              ['Daily OPD entries', String(systemInfo.dailyEntries)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-slate-100 px-2.5 py-1.5">
                <p className="text-slate-400 text-[10px]">{k}</p>
                <p
                  className={`font-semibold ${
                    k === 'Database'
                      ? systemInfo.databaseConnected
                        ? 'text-emerald-600'
                        : 'text-red-600'
                      : 'text-slate-800'
                  }`}
                >
                  {v}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className={`${card} p-3`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ScrollText size={14} className="text-slate-600" />
              <h2 className="text-[12.5px] font-semibold text-slate-800">Audit log</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuditLoading(true);
                fetchAuditLogs(80).then(setAuditRows).finally(() => setAuditLoading(false));
              }}
              className="text-[10px] text-[#1348f3] font-medium hover:underline"
            >
              Refresh
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <select
              value={auditAction}
              onChange={(e) => setAuditAction(e.target.value)}
              className="px-2 py-1 text-[11px] border border-slate-200 rounded-md bg-white"
            >
              <option value="all">All actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="export">Export</option>
            </select>
            <input
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Search who / what…"
              className="px-2 py-1 text-[11px] border border-slate-200 rounded-md bg-white w-44"
            />
            <button
              type="button"
              onClick={exportAuditCsv}
              disabled={shownAudit.length === 0}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
            >
              <Download size={11} /> CSV
            </button>
            <span className="text-[10px] text-slate-400">
              Showing {shownAudit.length} of {auditRows.length} recent actions
            </span>
          </div>
          <div className="max-h-48 overflow-auto border border-slate-100 rounded-md">
            {auditLoading ? (
              <p className="text-[11px] text-slate-400 p-3">Loading…</p>
            ) : shownAudit.length === 0 ? (
              <p className="text-[11px] text-slate-400 p-3">No audit entries found</p>
            ) : (
              <table className="w-full text-[10.5px]">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-2 py-1">When</th>
                    <th className="px-2 py-1">Action</th>
                    <th className="px-2 py-1">Who</th>
                    <th className="px-2 py-1">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {shownAudit.map((r) => (
                    <tr key={r.id} className="border-t border-slate-50">
                      <td className="px-2 py-1 text-slate-500 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-1 font-semibold uppercase text-slate-700">{r.action}</td>
                      <td className="px-2 py-1 text-slate-600">{r.actorName || r.actorEmail || '—'}</td>
                      <td className="px-2 py-1 text-slate-600">{r.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <div className="shrink-0 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  isAdmin
                    ? 'Reset hospital profile, targets and theme to defaults for ALL users?'
                    : 'Reset your theme to the default?'
                )
              ) {
                onResetSettings();
                showMsg('Settings reset to defaults');
              }
            }}
            className="text-[11px] text-slate-500 hover:text-slate-700 underline"
          >
            {isAdmin ? 'Reset settings to defaults' : 'Reset my appearance'}
          </button>
        </div>
    </div>
  );
}
