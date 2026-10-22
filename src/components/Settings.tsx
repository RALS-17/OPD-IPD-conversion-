import { useState } from 'react';
import { Building2, Target, Database, Trash2, Download, RotateCcw } from 'lucide-react';
import type { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  onExportCsv: () => void;
  onClearData: () => void;
  onReloadSample: () => void;
  admissionCount: number;
  isAdmin: boolean;
}

export default function Settings({
  settings,
  onUpdate,
  onResetSettings,
  onExportCsv,
  onClearData,
  onReloadSample,
  admissionCount,
  isAdmin,
}: SettingsProps) {
  const [message, setMessage] = useState('');

  const showMsg = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
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
            Configure hospital profile, conversion targets, and data tools.
          </p>
        </div>
        {message && (
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
            {message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {/* Hospital Profile */}
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Admin Display Name</label>
                <input
                  className={field}
                  value={settings.adminName}
                  onChange={(e) => onUpdate({ adminName: e.target.value })}
                  maxLength={80}
                />
              </div>
              <div>
                <label className={label}>Admin Role</label>
                <input
                  className={field}
                  value={settings.adminRole}
                  onChange={(e) => onUpdate({ adminRole: e.target.value })}
                  maxLength={60}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Targets */}
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
          </div>
        </div>

        {/* Data Tools */}
        <div className={`${card} p-3 lg:col-span-2`}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Database size={14} className="text-amber-600" />
            <h2 className="text-[12.5px] font-semibold text-slate-800">Data Tools</h2>
          </div>
          <p className="text-[11px] text-slate-500 mb-2">
            {admissionCount} admission record{admissionCount !== 1 ? 's' : ''} in system
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
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        'Reload sample Pinoy demo data? Current log will be replaced (local mode only).'
                      )
                    ) {
                      onReloadSample();
                      showMsg('Sample data loaded');
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-white border border-slate-200 rounded-md hover:bg-slate-50"
                >
                  <RotateCcw size={12} /> Reload sample
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear ALL admission records? This cannot be undone.')) {
                      onClearData();
                      showMsg('All data cleared');
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100"
                >
                  <Trash2 size={12} /> Clear all data
                </button>
              </>
            )}
          </div>
          {!isAdmin && (
            <p className="text-[10px] text-slate-400 mt-2">
              Only admins can clear or reload admission data.
            </p>
          )}
          <p className="text-[10px] text-slate-400 mt-2">
            Physician roster is managed under the <strong>Physicians</strong> menu (database).
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="shrink-0 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset all settings to defaults?')) {
                onResetSettings();
                showMsg('Settings reset to defaults');
              }
            }}
            className="text-[11px] text-slate-500 hover:text-slate-700 underline"
          >
            Reset settings to defaults
          </button>
        </div>
      )}
    </div>
  );
}
