import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AdmissionLog from './components/AdmissionLog';
import PhysicianSummary from './components/PhysicianSummary';
import Physicians from './components/Physicians';
import Settings from './components/Settings';
import Login from './components/Login';
import PageSkeleton from './components/PageSkeleton';
import { useAdmissions } from './hooks/useAdmissions';
import { useSettings } from './hooks/useSettings';
import { usePhysicians } from './hooks/usePhysicians';
import { useAuth } from './hooks/useAuth';
import type { Page } from './types';
import { Bell, LogOut } from 'lucide-react';

export default function App() {
  const {
    profile,
    loading: authLoading,
    error: authError,
    setError: setAuthError,
    signIn,
    signOut,
    isAuthenticated,
    isAdmin,
  } = useAuth();

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  // Staff cannot open dashboard
  useEffect(() => {
    if (isAuthenticated && !isAdmin && currentPage === 'dashboard') {
      setCurrentPage('admission-log');
    }
  }, [isAuthenticated, isAdmin, currentPage]);

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

  if (authLoading) {
    return <PageSkeleton page={currentPage} collapsed={collapsed} />;
  }

  if (!isAuthenticated) {
    return (
      <Login
        onLogin={signIn}
        error={authError}
        onClearError={() => setAuthError(null)}
      />
    );
  }

  if (!admissionsLoaded || !settingsLoaded || !physiciansLoaded) {
    return <PageSkeleton page={currentPage} collapsed={collapsed} />;
  }

  const kpis = getKpis();
  const mix = getMix();
  const physicianStats = getPhysicianStats();
  const topDiagnoses = getTopDiagnoses();
  const topComplaints = getTopComplaints();
  const monthlyTrend = getMonthlyTrend();
  const departmentByName = Object.fromEntries(
    physicians.map((p) => [p.name, p.department])
  );

  const displayName = profile?.fullName || settings.adminName;
  const displayRole =
    profile?.role === 'admin' ? 'Administrator' : profile?.role === 'staff' ? 'Staff' : settings.adminRole;
  const adminInitials = displayName
    .replace('Dr. ', '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleNavigate = (page: Page) => {
    if (!isAdmin && page === 'dashboard') return;
    setCurrentPage(page);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fb]">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        hospitalName={settings.hospitalName}
        branch={settings.branch}
        isAdmin={isAdmin}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-11 bg-white border-b border-slate-200 flex items-center justify-end px-3 shrink-0 z-20">
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
                  {displayName}
                </p>
                <p className="text-[9px] text-slate-400">{displayRole}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              title="Sign out"
              className="p-1.5 rounded-md hover:bg-slate-50 text-slate-500 hover:text-red-600"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <main
          className={`flex-1 min-h-0 ${
            currentPage === 'dashboard' ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <div className="h-full p-3">
            {currentPage === 'dashboard' && isAdmin && (
              <Dashboard
                kpis={kpis}
                mix={mix}
                physicianStats={physicianStats}
                departmentByName={departmentByName}
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
                isAdmin={isAdmin}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
