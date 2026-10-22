import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AdmissionLog from './components/AdmissionLog';
import PhysicianSummary from './components/PhysicianSummary';
import Physicians from './components/Physicians';
import Settings from './components/Settings';
import PageSkeleton from './components/PageSkeleton';
import { useAdmissions } from './hooks/useAdmissions';
import { useSettings } from './hooks/useSettings';
import { usePhysicians } from './hooks/usePhysicians';
import type { Page } from './types';
import { Bell, Search } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const {
    admissions,
    addAdmission,
    updateAdmission,
    deleteAdmission,
    clearAllData,
    reloadSampleData,
    exportCsv,
    getPhysicianStats,
    getKpis,
    getMix,
    getTopDiagnoses,
    getTopComplaints,
    getMonthlyTrend,
    loaded: admissionsLoaded,
  } = useAdmissions();

  const { settings, updateSettings, resetSettings, loaded: settingsLoaded } = useSettings();

  const {
    physicians,
    physicianNames,
    addPhysician,
    editPhysician,
    removePhysician,
    loaded: physiciansLoaded,
    error: physiciansError,
    usingSupabase,
  } = usePhysicians();

  if (!admissionsLoaded || !settingsLoaded || !physiciansLoaded) {
    return <PageSkeleton page={currentPage} collapsed={collapsed} />;
  }

  const kpis = getKpis();
  const mix = getMix();
  const physicianStats = getPhysicianStats();
  const topDiagnoses = getTopDiagnoses();
  const topComplaints = getTopComplaints();
  const monthlyTrend = getMonthlyTrend();
  const adminInitials = settings.adminName
    .replace('Dr. ', '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fb]">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        hospitalName={settings.hospitalName}
        branch={settings.branch}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-11 bg-white border-b border-slate-200 flex items-center justify-between px-3 shrink-0 z-20">
          <div className="flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search patients, physicians, admissions..."
                className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 focus:border-[#1348f3] placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="relative p-1.5 rounded-md hover:bg-slate-50 text-slate-500">
              <Bell size={15} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">
                {adminInitials}
              </div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-semibold text-slate-800 leading-tight">
                  {settings.adminName}
                </p>
                <p className="text-[9px] text-slate-400">{settings.adminRole}</p>
              </div>
            </div>
          </div>
        </header>

        <main
          className={`flex-1 min-h-0 ${
            currentPage === 'dashboard' ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <div className="h-full p-3">
            {currentPage === 'dashboard' && (
              <Dashboard
                kpis={kpis}
                mix={mix}
                physicianStats={physicianStats}
                topDiagnoses={topDiagnoses}
                topComplaints={topComplaints}
                monthlyTrend={monthlyTrend}
                targetConversion={settings.targetConversion}
                goodThreshold={settings.goodThreshold}
                averageThreshold={settings.averageThreshold}
              />
            )}
            {currentPage === 'admission-log' && (
              <AdmissionLog
                admissions={admissions}
                onAdd={addAdmission}
                onUpdate={updateAdmission}
                onDelete={deleteAdmission}
                physicians={physicianNames}
              />
            )}
            {currentPage === 'physician-summary' && (
              <PhysicianSummary
                stats={physicianStats}
                goodThreshold={settings.goodThreshold}
                averageThreshold={settings.averageThreshold}
              />
            )}
            {currentPage === 'physicians' && (
              <Physicians
                physicians={physicians}
                onAdd={addPhysician}
                onEdit={editPhysician}
                onDelete={removePhysician}
                usingSupabase={usingSupabase}
                error={physiciansError}
              />
            )}
            {currentPage === 'settings' && (
              <Settings
                settings={settings}
                onUpdate={updateSettings}
                onResetSettings={resetSettings}
                onExportCsv={exportCsv}
                onClearData={clearAllData}
                onReloadSample={reloadSampleData}
                admissionCount={admissions.length}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
