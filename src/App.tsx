import { useState, useEffect, useRef } from 'react';
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
import {
  filterByDateRange,
  filterByPhysician,
  previousRange,
  rangeForPreset,
  type DatePreset,
} from './lib/admissionFilters';
import { LogOut } from 'lucide-react';
import NotificationBell from './components/NotificationBell';
import { buildNotifications } from './lib/notifications';
import PhysicianDetail from './components/PhysicianDetail';
import { printDashboardSnapshot } from './lib/printDashboard';
import {
  applyOpdConsultOverrides,
  fetchOpdConsultOverrides,
  loadOpdConsultOverrides,
  type OpdConsultOverrides,
} from './lib/opdConsultOverrides';


const PAGE_PATH: Record<Page, string> = {
  dashboard: 'dashboard',
  'admission-log': 'admission-log',
  'physician-summary': 'physician-summary',
  physicians: 'physicians',
  settings: 'settings',
};

const PATH_PAGE: Record<string, Page> = {
  dashboard: 'dashboard',
  'admission-log': 'admission-log',
  'physician-summary': 'physician-summary',
  physicians: 'physicians',
  settings: 'settings',
};

const PAGE_TITLE: Record<Page, string> = {
  dashboard: 'Dashboard',
  'admission-log': 'Admission Log',
  'physician-summary': 'Physician Summary',
  physicians: 'Physicians',
  settings: 'Settings',
};

function pageFromHash(): Page | null {
  const raw = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0].trim();
  if (!raw) return null;
  return PATH_PAGE[raw] ?? null;
}

function setHashForPage(page: Page) {
  const path = PAGE_PATH[page];
  const next = `#/${path}`;
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
}

function applyDocumentTitle(page: Page) {
  document.title = `${PAGE_TITLE[page]} | Global Care OPD → IPD`;
}


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
    isDoctor,
    physicianName,
  } = useAuth();

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'OPD' | 'ER' | 'Direct'>('All');
  const [dateFrom, setDateFrom] = useState(() => rangeForPreset('month')?.from || '');
  const [dateTo, setDateTo] = useState(() => rangeForPreset('month')?.to || '');
  const [drillPhysician, setDrillPhysician] = useState<string | null>(null);
  const [opdOverrides, setOpdOverrides] = useState<OpdConsultOverrides>(() =>
    loadOpdConsultOverrides()
  );
  const defaultPageSet = useRef(false);

  // Load permanent OPD totals from Supabase (shared across devices)
  useEffect(() => {
    let cancelled = false;
    void fetchOpdConsultOverrides().then((map) => {
      if (!cancelled) setOpdOverrides(map);
    });
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<OpdConsultOverrides>).detail;
      if (detail) setOpdOverrides(detail);
    };
    window.addEventListener('opd-totals-changed', onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('opd-totals-changed', onChanged);
    };
  }, []);

  // Set default page once profile is known (admin → Dashboard)
  useEffect(() => {
    if (!isAuthenticated) {
      defaultPageSet.current = false;
      return;
    }
    if (!profile) return;
    if (!defaultPageSet.current) {
      defaultPageSet.current = true;
      const fromUrl = pageFromHash();
      let next: Page =
        fromUrl ??
        (profile.role === 'admin' ? 'dashboard' : 'admission-log');
      if (profile.role !== 'admin' && next === 'dashboard') next = 'admission-log';
      if (profile.role === 'doctor' && next === 'physicians') next = 'admission-log';
      setCurrentPage(next);
      setHashForPage(next);
      applyDocumentTitle(next);
    }
  }, [isAuthenticated, profile]);

  // Guard restricted pages only after role is known
  useEffect(() => {
    if (!isAuthenticated || !profile) return;
    if (profile.role !== 'admin' && currentPage === 'dashboard') {
      setCurrentPage('admission-log');
      setHashForPage('admission-log');
    }
    if (profile.role === 'doctor' && currentPage === 'physicians') {
      setCurrentPage('admission-log');
      setHashForPage('admission-log');
    }
  }, [isAuthenticated, profile, currentPage]);


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
    getMonthlyTrend,
    setAuditActor,
    loaded: admissionsLoaded,
  } = useAdmissions();

  const { settings, updateSettings, resetSettings, loaded: settingsLoaded } = useSettings();

  const {
    physicians,
    physicianNames,
    loginLinked,
    addPhysician,
    editPhysician,
    removePhysician,
    loaded: physiciansLoaded,
    error: physiciansError,
    usingSupabase,
  } = usePhysicians();

  useEffect(() => {
    if (profile) {
      setAuditActor(profile.fullName || '', profile.email || '');
    }
  }, [profile, setAuditActor]);

  // Apply light/dark theme (after settings hook is available)
  useEffect(() => {
    if (!settingsLoaded) return;
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme, settingsLoaded]);

  // Sync URL hash ↔ current page + browser tab title (must be before any early returns)
  useEffect(() => {
    applyDocumentTitle(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const onHash = () => {
      const fromUrl = pageFromHash();
      if (!fromUrl) return;
      if (!isAdmin && fromUrl === 'dashboard') {
        setCurrentPage('admission-log');
        setHashForPage('admission-log');
        return;
      }
      if (isDoctor && fromUrl === 'physicians') {
        setCurrentPage('admission-log');
        setHashForPage('admission-log');
        return;
      }
      setCurrentPage(fromUrl);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [isAdmin, isDoctor]);

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

  const departmentByName = Object.fromEntries(
    physicians.map((p) => [p.name, p.department])
  );
  const physicianMeta = Object.fromEntries(
    physicians.map((p) => [
      p.name,
      {
        staffType: p.staffType,
        specialization: p.specialization,
        subSpecialization: p.subSpecialization,
      },
    ])
  );

  const roleScopedAdmissions = filterByPhysician(
    admissions,
    isDoctor ? physicianName : null
  );

  const activeRange =
    datePreset === 'custom'
      ? { from: dateFrom || undefined, to: dateTo || undefined }
      : rangeForPreset(datePreset);

  const dateFilteredAdmissions = filterByDateRange(
    roleScopedAdmissions,
    activeRange?.from,
    activeRange?.to
  );
  const filteredAdmissions =
    sourceFilter === 'All'
      ? dateFilteredAdmissions
      : dateFilteredAdmissions.filter((a) => a.source === sourceFilter);

  const prevRangeInfo = previousRange(datePreset, dateFrom, dateTo);
  const prevAdmissions = prevRangeInfo
    ? filterByDateRange(roleScopedAdmissions, prevRangeInfo.from, prevRangeInfo.to)
    : [];
  const prevPhysicianStats = prevRangeInfo
    ? applyOpdConsultOverrides(getPhysicianStats(prevAdmissions), opdOverrides)
    : [];
  const prevBaseKpis = prevRangeInfo ? getKpis(prevAdmissions) : null;
  const prevTotalOpd = prevPhysicianStats.reduce((sum, p) => sum + p.totalOpdConsults, 0);
  const prevKpis = prevBaseKpis
    ? {
        ...prevBaseKpis,
        totalOpd: prevTotalOpd,
        conversion:
          prevTotalOpd > 0
            ? Math.round((prevBaseKpis.actual / prevTotalOpd) * 1000) / 10
            : 0,
      }
    : null;
  const prevSystemTotalOpd = prevPhysicianStats.reduce(
    (sum, p) => sum + (p.systemOpdConsults ?? p.totalOpdConsults),
    0
  );
  // After overrides, totalOpdConsults is the effective total; systemOpdConsults may be set by applyOpdConsultOverrides
  const prevMonthlyTrendRaw = prevRangeInfo ? getMonthlyTrend(prevAdmissions) : null;
  const prevConversionScale =
    prevTotalOpd > 0 && prevSystemTotalOpd > 0
      ? prevSystemTotalOpd / prevTotalOpd
      : 1;
  const prevMonthlyTrend = prevMonthlyTrendRaw
    ? {
        ...prevMonthlyTrendRaw,
        points: prevMonthlyTrendRaw.points.map((pt) => ({
          ...pt,
          value: Math.min(100, Math.round(pt.value * prevConversionScale * 10) / 10),
        })),
      }
    : null;

  const mix = getMix(filteredAdmissions);
  const systemPhysicianStats = getPhysicianStats(filteredAdmissions);
  const physicianStats = applyOpdConsultOverrides(systemPhysicianStats, opdOverrides);
  // Total OPD + conversion use per-physician totals (includes Physician Summary edits)
  const baseKpis = getKpis(filteredAdmissions);
  const systemTotalOpd = systemPhysicianStats.reduce((sum, p) => sum + p.totalOpdConsults, 0);
  const totalOpd = physicianStats.reduce((sum, p) => sum + p.totalOpdConsults, 0);
  const kpis = {
    ...baseKpis,
    totalOpd,
    conversion:
      totalOpd > 0
        ? Math.round((baseKpis.actual / totalOpd) * 1000) / 10
        : 0,
  };
  const topDiagnoses = getTopDiagnoses(filteredAdmissions, 10);
  // Scale daily conversion so trend matches override-aware overall rate
  const conversionScale =
    totalOpd > 0 && systemTotalOpd > 0 ? systemTotalOpd / totalOpd : 1;
  const monthlyTrendRaw = getMonthlyTrend(filteredAdmissions);
  const monthlyTrend = {
    ...monthlyTrendRaw,
    points: monthlyTrendRaw.points.map((pt) => ({
      ...pt,
      value: Math.min(100, Math.round(pt.value * conversionScale * 10) / 10),
    })),
  };
  const summaryPhysicianStats = systemPhysicianStats;

  const handleExportFiltered = () => {
    exportCsv(filteredAdmissions);
  };

  const periodLabelForPrint = (() => {
    if (datePreset === 'today') return 'Today';
    if (datePreset === 'week') return 'Last 7 days';
    if (datePreset === 'month') return 'This month';
    if (datePreset === 'all') return 'All time';
    if (dateFrom && dateTo) return `${dateFrom} – ${dateTo}`;
    return 'Custom range';
  })();

  const handlePrintSnapshot = () => {
    printDashboardSnapshot({
      hospitalName: settings.hospitalName,
      branch: settings.branch,
      periodLabel: periodLabelForPrint,
      compareLabel: prevRangeInfo?.label ?? null,
      generatedAt: new Date().toLocaleString(),
      kpis,
      prevKpis,
      topPhysicians: physicianStats.slice(0, 10).map((p) => ({
        physician: p.physician,
        department: departmentByName[p.physician],
        totalOpdConsults: p.totalOpdConsults,
        actualAdmissionsFromOpd: p.actualAdmissionsFromOpd,
        conversionRate: p.conversionRate,
      })),
      topDiagnoses: topDiagnoses.slice(0, 10),
      filteredCount: filteredAdmissions.length,
    });
  };

  const notifItems = buildNotifications({
    admissions,
    targetConversion: settings.targetConversion,
    goodThreshold: settings.goodThreshold,
    isAdmin,
    isDoctor,
    physicianName,
  });

  const handleDatePreset = (preset: string) => {
    const p = preset as DatePreset;
    setDatePreset(p);
    if (p !== 'custom') {
      const r = rangeForPreset(p);
      setDateFrom(r?.from || '');
      setDateTo(r?.to || '');
    }
  };

  const displayName = profile?.fullName || settings.adminName;
  const displayRole =
    profile?.role === 'admin'
      ? 'Administrator'
      : profile?.role === 'doctor'
        ? 'Doctor'
        : profile?.role === 'staff'
          ? 'Staff'
          : settings.adminRole;
  const adminInitials = displayName
    .replace('Dr. ', '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleNavigate = (page: Page) => {
    if (!isAdmin && page === 'dashboard') return;
    if (isDoctor && page === 'physicians') return;
    setCurrentPage(page);
    setHashForPage(page);
    applyDocumentTitle(page);
  };

  // Doctors only see their own admissions (by OPD attending name)
  const visibleAdmissions = roleScopedAdmissions;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f4f7fb] dark:bg-slate-950">
      {/* Full-width top header — logo always far left, never collapses */}
      <header className="h-11 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-3 shrink-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/logo.svg" alt="Logo" className="w-7 h-7 object-contain shrink-0" />
          <div className="min-w-0">
            <h1 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-tight underline decoration-[#1348f3] decoration-2 underline-offset-[3px] truncate">
              {settings.hospitalName}
            </h1>
            <p className="text-[9.5px] text-slate-500 font-medium tracking-wide truncate leading-tight">
              OPD → IPD Monitor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <NotificationBell items={notifItems} />
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">
              {adminInitials}
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {displayName}
              </p>
              <p className="text-[9px] text-slate-400">{displayRole}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            title="Sign out"
            className="p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-red-600"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Below header: collapsible sidebar + main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          hospitalName={settings.hospitalName}
          branch={settings.branch}
          isAdmin={isAdmin}
          isDoctor={isDoctor}
        />

        <main
          className={`flex-1 min-h-0 min-w-0 ${
            currentPage === 'dashboard' ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <div className="h-full p-3">
            {currentPage === 'dashboard' && isAdmin && (
              <Dashboard
                kpis={kpis}
                prevKpis={prevKpis}
                compareLabel={prevRangeInfo?.label ?? null}
                mix={mix}
                physicianStats={physicianStats}
                departmentByName={departmentByName}
                monthlyTrend={monthlyTrend}
                prevMonthlyTrend={prevMonthlyTrend}
                targetConversion={settings.targetConversion}
                goodThreshold={settings.goodThreshold}
                averageThreshold={settings.averageThreshold}
                datePreset={datePreset}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDatePreset={handleDatePreset}
                onDateFrom={setDateFrom}
                onDateTo={setDateTo}
                sourceFilter={sourceFilter}
                onSourceFilter={setSourceFilter}
                onExport={handleExportFiltered}
                onPrintSnapshot={handlePrintSnapshot}
                filteredCount={filteredAdmissions.length}
                filteredAdmissions={filteredAdmissions}
                onPhysicianClick={(name) => setDrillPhysician(name)}
              />
            )}
            {currentPage === 'admission-log' && (
              <AdmissionLog
                admissions={visibleAdmissions}
                onAdd={addAdmission}
                onUpdate={updateAdmission}
                onDelete={deleteAdmission}
                physicians={physicianNames}
                departmentByName={departmentByName}
                physicianMeta={physicianMeta}
                isDoctor={isDoctor}
                physicianName={physicianName}
              />
            )}
            {currentPage === 'physician-summary' && (
              <PhysicianSummary
                stats={summaryPhysicianStats}
                goodThreshold={settings.goodThreshold}
                averageThreshold={settings.averageThreshold}
                departmentByName={departmentByName}
                onPhysicianClick={(name) => setDrillPhysician(name)}
                opdOverrides={opdOverrides}
                onOpdOverridesChange={setOpdOverrides}
                datePreset={datePreset}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDatePreset={handleDatePreset}
                onDateFrom={setDateFrom}
                onDateTo={setDateTo}
              />
            )}
            {currentPage === 'physicians' && !isDoctor && (
              <Physicians
                physicians={physicians}
                loginLinked={loginLinked}
                onAdd={addPhysician}
                onEdit={editPhysician}
                onDelete={removePhysician}
                usingSupabase={usingSupabase}
                error={physiciansError}
                canManageAccounts={isAdmin}
              />
            )}
            {currentPage === 'settings' && (
              <Settings
                settings={settings}
                onUpdate={updateSettings}
                onResetSettings={resetSettings}
                onExportCsv={() => exportCsv(roleScopedAdmissions)}
                onClearData={clearAllData}
                onReloadSample={reloadSampleData}
                admissionCount={admissions.length}
                isAdmin={isAdmin}
              />
            )}
          </div>
        </main>
      </div>

      {drillPhysician && (
        <PhysicianDetail
          physician={drillPhysician}
          admissions={roleScopedAdmissions}
          department={departmentByName[drillPhysician]}
          goodThreshold={settings.goodThreshold}
          averageThreshold={settings.averageThreshold}
          onClose={() => setDrillPhysician(null)}
        />
      )}
    </div>
  );
}
