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
import { useAuth, type AuthProfile } from './hooks/useAuth';
import { useDailyEntries } from './hooks/useDailyEntries';
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
import Toaster from './components/Toaster';
import { toast } from './lib/toast';
import { buildNotifications } from './lib/notifications';
import PhysicianDetail from './components/PhysicianDetail';
import { printDashboardSnapshot } from './lib/printDashboard';
import {
  applyDailyEntries,
  entryDelta,
  buildVolumeByDate,
  filterEntriesByRange,
  sumEntriesByPhysician,
} from './lib/physicianDailyEntries';
import type { DailyEntrySavePayload } from './components/DailyEntryModal';


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


/**
 * Everything that needs a signed-in user lives in AuthedApp.
 * It is mounted with key={user id}, so signing out / switching accounts throws away ALL
 * data, filters and realtime subscriptions of the previous user, and a fresh sign-in always
 * loads its data with the new session (no blank screen, no leftovers from the last user).
 */
function AuthedApp({
  auth,
  profile,
}: {
  auth: ReturnType<typeof useAuth>;
  profile: AuthProfile;
}) {
  const { signOut, changePassword, isAdmin, isStaff, isDoctor, physicianName } = auth;

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'OPD' | 'ER' | 'Direct'>('All');
  const [dashDeptFilter, setDashDeptFilter] = useState('All');
  const [dashDoctorFilter, setDashDoctorFilter] = useState('All');
  /** consults = all records in range; admitted = only actually admitted */
  const [recordScopeFilter, setRecordScopeFilter] = useState<'consults' | 'admitted'>('consults');
  const [dateFrom, setDateFrom] = useState(() => rangeForPreset('month')?.from || '');
  const [dateTo, setDateTo] = useState(() => rangeForPreset('month')?.to || '');
  // Physician Summary has its own filters (independent from the Dashboard)
  const [sumDatePreset, setSumDatePreset] = useState<DatePreset>('month');
  const [sumDateFrom, setSumDateFrom] = useState(() => rangeForPreset('month')?.from || '');
  const [sumDateTo, setSumDateTo] = useState(() => rangeForPreset('month')?.to || '');
  const [sumDeptFilter, setSumDeptFilter] = useState('All');
  const [sumDoctorFilter, setSumDoctorFilter] = useState('All');
  const [drillPhysician, setDrillPhysician] = useState<string | null>(null);
  const defaultPageSet = useRef(false);

  // Set default page once profile is known (admin → Dashboard)
  useEffect(() => {
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
  }, [profile]);

  // Guard restricted pages only after role is known
  useEffect(() => {
    if (profile.role !== 'admin' && currentPage === 'dashboard') {
      setCurrentPage('admission-log');
      setHashForPage('admission-log');
    }
    if (profile.role === 'doctor' && currentPage === 'physicians') {
      setCurrentPage('admission-log');
      setHashForPage('admission-log');
    }
  }, [profile, currentPage]);


  const {
    admissions,
    addAdmission,
    updateAdmission,
    deleteAdmission,
    exportCsv,
    getPhysicianStats,
    getKpis,
    getMix,
    getTopDiagnoses,
    getMonthlyTrend,
    setAuditActor,
    loaded: admissionsLoaded,
  } = useAdmissions();

  const {
    settings,
    updateSettings,
    resetSettings,
    loaded: settingsLoaded,
  } = useSettings(true, isAdmin);

  const {
    physicians,
    allPhysicians,
    physicianNames,
    housePhysicianNames,
    loginLinked,
    addPhysician,
    createPhysicianByName,
    editPhysician,
    removePhysician,
    loaded: physiciansLoaded,
    error: physiciansError,
    usingSupabase,
  } = usePhysicians();

  const {
    entries: dailyEntries,
    loaded: entriesLoaded,
    error: entriesError,
    saveDay: saveDailyEntriesDay,
  } = useDailyEntries();

  useEffect(() => {
    setAuditActor(profile.fullName || '', profile.email || '');
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

  if (!admissionsLoaded || !settingsLoaded || !physiciansLoaded || !entriesLoaded) {
    return <PageSkeleton page={currentPage} collapsed={collapsed} />;
  }

  // Lookups use EVERY physician (even inactive) so old records still resolve their department
  const departmentByName = Object.fromEntries(
    allPhysicians.map((p) => [p.name, p.department])
  );
  const physicianMeta = Object.fromEntries(
    allPhysicians.map((p) => [
      p.name,
      {
        staffType: p.staffType,
        specialization: p.specialization,
        subSpecialization: p.subSpecialization,
      },
    ])
  );

  // Doctors only ever see their own patients. A doctor not linked to a physician sees nothing.
  const roleScopedAdmissions = isDoctor
    ? physicianName
      ? filterByPhysician(admissions, physicianName)
      : []
    : admissions;

  // Permissions: admin = everything · admitting staff = add/edit admissions only · doctor = view only
  const canAddEditAdmissions = isAdmin || isStaff;
  const canDeleteAdmissions = isAdmin;
  const denied = async (): Promise<boolean> => {
    toast.error('You do not have permission to do that.');
    return false;
  };
  // Doctors don't need the full doctor roster
  const visiblePhysicianNames = isDoctor
    ? physicianName
      ? [physicianName]
      : []
    : physicianNames;

  const activeRange =
    datePreset === 'custom'
      ? { from: dateFrom || undefined, to: dateTo || undefined }
      : rangeForPreset(datePreset);

  const dateFilteredAdmissions = filterByDateRange(
    roleScopedAdmissions,
    activeRange?.from,
    activeRange?.to
  );
  const sourceFilteredAdmissions =
    sourceFilter === 'All'
      ? dateFilteredAdmissions
      : dateFilteredAdmissions.filter((a) => a.source === sourceFilter);

  const filteredAdmissions = sourceFilteredAdmissions.filter((a) => {
    if (dashDeptFilter !== 'All') {
      const dept = (departmentByName[a.opdAttendingPhysician] || '').trim();
      if (dept !== dashDeptFilter) return false;
    }
    if (dashDoctorFilter !== 'All') {
      if ((a.opdAttendingPhysician || '').trim() !== dashDoctorFilter) return false;
    }
    if (recordScopeFilter === 'admitted' && a.actuallyAdmitted !== 'Yes') {
      return false;
    }
    return true;
  });

  const prevRangeInfo = previousRange(datePreset, dateFrom, dateTo);
  const prevDateAdmissions = prevRangeInfo
    ? filterByDateRange(roleScopedAdmissions, prevRangeInfo.from, prevRangeInfo.to)
    : [];
  const prevAdmissions = (
    sourceFilter === 'All'
      ? prevDateAdmissions
      : prevDateAdmissions.filter((a) => a.source === sourceFilter)
  ).filter((a) => {
    if (dashDeptFilter !== 'All') {
      const dept = (departmentByName[a.opdAttendingPhysician] || '').trim();
      if (dept !== dashDeptFilter) return false;
    }
    if (dashDoctorFilter !== 'All') {
      if ((a.opdAttendingPhysician || '').trim() !== dashDoctorFilter) return false;
    }
    if (recordScopeFilter === 'admitted' && a.actuallyAdmitted !== 'Yes') return false;
    return true;
  });

  // Daily entries are OPD consult data: they apply to "All sources" and "OPD",
  // but not to the ER-only / Direct-only views.
  const manualApplies = sourceFilter === 'All' || sourceFilter === 'OPD';

  // Doctors only ever see their own entries
  const scopedEntries = isDoctor
    ? dailyEntries.filter((e) => e.physician === (physicianName || ''))
    : dailyEntries;

  const matchesDashFilters = (name: string) => {
    if (dashDeptFilter !== 'All') {
      if ((departmentByName[name] || '').trim() !== dashDeptFilter) return false;
    }
    if (dashDoctorFilter !== 'All' && name.trim() !== dashDoctorFilter) return false;
    return true;
  };

  const entriesInRange = filterEntriesByRange(scopedEntries, activeRange?.from, activeRange?.to);
  const dashEntryTotals = sumEntriesByPhysician(
    entriesInRange.filter((e) => matchesDashFilters(e.physician))
  );

  const prevDashEntryTotals = prevRangeInfo
    ? sumEntriesByPhysician(
        filterEntriesByRange(scopedEntries, prevRangeInfo.from, prevRangeInfo.to).filter((e) =>
          matchesDashFilters(e.physician)
        )
      )
    : {};

  const prevSystemPhysicianStats = prevRangeInfo
    ? getPhysicianStats(prevAdmissions)
    : [];
  const prevPhysicianStats =
    prevRangeInfo && manualApplies
      ? applyDailyEntries(prevSystemPhysicianStats, prevDashEntryTotals)
      : prevSystemPhysicianStats;
  const prevBaseKpis = prevRangeInfo ? getKpis(prevAdmissions) : null;
  const prevDelta = manualApplies
    ? entryDelta(prevSystemPhysicianStats, prevPhysicianStats)
    : null;
  const prevVolume = prevAdmissions.length + (prevDelta?.total ?? 0);
  const prevKpis = prevBaseKpis
    ? {
        ...prevBaseKpis,
        totalOpd: prevVolume,
        conversion:
          prevVolume > 0
            ? Math.round((prevBaseKpis.actual / prevVolume) * 1000) / 10
            : 0,
      }
    : null;

  // Exact daily volume (records + daily entries, same rules as the totals above)
  const prevMonthlyTrend = prevRangeInfo
    ? getMonthlyTrend(
        prevAdmissions,
        buildVolumeByDate(
          prevAdmissions,
          filterEntriesByRange(scopedEntries, prevRangeInfo.from, prevRangeInfo.to).filter((e) =>
            matchesDashFilters(e.physician)
          ),
          manualApplies
        )
      )
    : null;

  const systemPhysicianStats = getPhysicianStats(filteredAdmissions);
  const physicianStats = manualApplies
    ? applyDailyEntries(systemPhysicianStats, dashEntryTotals)
    : systemPhysicianStats;
  const delta = manualApplies ? entryDelta(systemPhysicianStats, physicianStats) : null;

  // Patient-mix cards: Admission-Log counts + what the daily entries add/replace
  const baseMix = getMix(filteredAdmissions);
  const mixHmo = Math.max(0, baseMix.hmo + (delta?.hmo ?? 0));
  const mixCash = Math.max(0, baseMix.cash + (delta?.cash ?? 0));
  const mixPayTotal = mixHmo + mixCash || 1;
  const mix = {
    ...baseMix,
    hmo: mixHmo,
    cash: mixCash,
    private: Math.max(0, baseMix.private + (delta?.private ?? 0)),
    walkIn: Math.max(0, baseMix.walkIn + (delta?.walkIn ?? 0)),
    hmoPct: Math.round((mixHmo / mixPayTotal) * 1000) / 10,
    cashPct: Math.round((mixCash / mixPayTotal) * 1000) / 10,
  };

  const baseKpis = getKpis(filteredAdmissions);
  const totalVolume = filteredAdmissions.length + (delta?.total ?? 0);
  const kpis = {
    ...baseKpis,
    totalOpd: totalVolume,
    conversion:
      totalVolume > 0
        ? Math.round((baseKpis.actual / totalVolume) * 1000) / 10
        : 0,
  };
  const topDiagnoses = getTopDiagnoses(filteredAdmissions, 10);
  const monthlyTrend = getMonthlyTrend(
    filteredAdmissions,
    buildVolumeByDate(
      filteredAdmissions,
      entriesInRange.filter((e) => matchesDashFilters(e.physician)),
      manualApplies
    )
  );

  // Physician Summary: its own date range, all sources, daily entries applied
  const sumRange =
    sumDatePreset === 'custom'
      ? { from: sumDateFrom || undefined, to: sumDateTo || undefined }
      : rangeForPreset(sumDatePreset);
  const sumAdmissions = filterByDateRange(roleScopedAdmissions, sumRange?.from, sumRange?.to);
  const sumEntryTotals = sumEntriesByPhysician(
    filterEntriesByRange(scopedEntries, sumRange?.from, sumRange?.to)
  );
  const summaryPhysicianStats = applyDailyEntries(getPhysicianStats(sumAdmissions), sumEntryTotals);

  const errorText = (e: unknown): string => {
    if (e instanceof Error) return e.message;
    const m = (e as { message?: string } | null)?.message;
    return m || 'Unknown error';
  };

  /** Save one date for many doctors at once (adds new doctors to the roster first). */
  const handleSaveDailyEntries = async ({ date, rows, newDoctors }: DailyEntrySavePayload) => {
    const existing = new Set(allPhysicians.map((p) => p.name.trim().toLowerCase()));
    for (const name of newDoctors) {
      if (existing.has(name.trim().toLowerCase())) continue; // already in the roster
      try {
        await createPhysicianByName(name);
        existing.add(name.trim().toLowerCase());
      } catch (e) {
        throw new Error(`Could not add doctor "${name}": ${errorText(e)}`);
      }
    }
    try {
      await saveDailyEntriesDay(date, rows);
    } catch (e) {
      throw new Error(
        `Could not save the entries: ${errorText(e)}. If this is the first time, run supabase/physician_daily_entries.sql in Supabase.`
      );
    }
  };

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

  const handleSumDatePreset = (preset: string) => {
    const p = preset as DatePreset;
    setSumDatePreset(p);
    if (p !== 'custom') {
      const r = rangeForPreset(p);
      setSumDateFrom(r?.from || '');
      setSumDateTo(r?.to || '');
    }
  };

  const displayName = profile?.fullName || profile?.email || 'User';
  const displayRole =
    profile?.role === 'admin'
      ? 'Administrator'
      : profile?.role === 'doctor'
        ? 'Doctor'
        : profile?.role === 'staff'
          ? 'Staff'
          : 'User';
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
                departmentFilter={dashDeptFilter}
                onDepartmentFilter={setDashDeptFilter}
                doctorFilter={dashDoctorFilter}
                onDoctorFilter={setDashDoctorFilter}
                recordScopeFilter={recordScopeFilter}
                onRecordScopeFilter={setRecordScopeFilter}
                physicianNames={physicianNames}
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
                onAdd={canAddEditAdmissions ? addAdmission : denied}
                onUpdate={canAddEditAdmissions ? updateAdmission : denied}
                onDelete={canDeleteAdmissions ? deleteAdmission : denied}
                canAdd={canAddEditAdmissions}
                canEdit={canAddEditAdmissions}
                canDelete={canDeleteAdmissions}
                physicians={visiblePhysicianNames}
                housePhysicians={housePhysicianNames}
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
                canEdit={isAdmin}
                rosterNames={physicianNames}
                entries={scopedEntries}
                entriesError={entriesError}
                onSaveDailyEntries={handleSaveDailyEntries}
                datePreset={sumDatePreset}
                dateFrom={sumDateFrom}
                dateTo={sumDateTo}
                onDatePreset={handleSumDatePreset}
                onDateFrom={setSumDateFrom}
                onDateTo={setSumDateTo}
                departmentFilter={sumDeptFilter}
                onDepartmentFilter={setSumDeptFilter}
                doctorFilter={sumDoctorFilter}
                onDoctorFilter={setSumDoctorFilter}
                physicianNames={visiblePhysicianNames}
              />
            )}
            {currentPage === 'physicians' && !isDoctor && (
              <Physicians
                physicians={physicians}
                loginLinked={loginLinked}
                onAdd={isAdmin ? addPhysician : denied}
                onEdit={isAdmin ? editPhysician : denied}
                onDelete={isAdmin ? removePhysician : denied}
                canEdit={isAdmin}
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
                admissionCount={roleScopedAdmissions.length}
                isAdmin={isAdmin}
                account={{
                  fullName: profile?.fullName || '',
                  email: profile?.email || '',
                  role: profile?.role ?? 'doctor',
                  physicianName,
                  physicianDepartment: physicianName
                    ? departmentByName[physicianName]
                    : undefined,
                }}
                onChangePassword={changePassword}
                systemInfo={{
                  physicians: physicians.length,
                  dailyEntries: dailyEntries.length,
                  databaseConnected: usingSupabase,
                }}
              />
            )}
          </div>
        </main>
      </div>

      <Toaster />

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

export default function App() {
  const auth = useAuth();

  if (auth.loading) {
    return <PageSkeleton page="dashboard" collapsed={false} />;
  }

  if (!auth.isAuthenticated) {
    return (
      <Login
        onLogin={auth.signIn}
        error={auth.error}
        onClearError={() => auth.setError(null)}
      />
    );
  }

  // Signed in, but the role/profile is still loading: never render data without it
  if (!auth.profile) {
    return <PageSkeleton page="dashboard" collapsed={false} />;
  }

  return <AuthedApp key={auth.profile.id} auth={auth} profile={auth.profile} />;
}
