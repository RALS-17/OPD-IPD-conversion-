import type { CSSProperties, ReactNode } from 'react';
import type { Page } from '../types';

const bone = 'bg-slate-200/80 animate-pulse rounded-md';
const card = 'bg-white rounded-md border border-slate-200 shadow-sm';

function Bone({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={`${bone} ${className}`} style={style} />;
}

function KpiCardSkeleton() {
  return (
    <div className={`${card} px-3 py-2 flex items-center gap-2.5`}>
      <Bone className="w-8 h-8 shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Bone className="h-2.5 w-20" />
        <Bone className="h-5 w-14" />
        <Bone className="h-2 w-12" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 h-full overflow-hidden">
      <div className="grid grid-cols-4 gap-2.5 shrink-0">
        {[0, 1, 2, 3].map((i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2.5 shrink-0">
        {[0, 1, 2, 3].map((i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-2.5">
        <div className="col-span-2 flex flex-col gap-2.5 min-h-0">
          <div
            className="grid gap-2.5 shrink-0"
            style={{ height: '48%', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)' }}
          >
            <div className={`${card} p-3 flex flex-col`}>
              <Bone className="h-3 w-40 mb-3" />
              <div className="flex-1 flex items-center justify-center">
                <Bone className="w-36 h-20 rounded-full" />
              </div>
              <Bone className="h-2.5 w-28 mx-auto mt-2" />
            </div>
            <div className={`${card} p-3 flex flex-col`}>
              <div className="flex justify-between mb-2">
                <Bone className="h-3 w-44" />
                <Bone className="h-5 w-16" />
              </div>
              <Bone className="flex-1 w-full min-h-[80px]" />
            </div>
          </div>
          <div className={`${card} flex-1 min-h-0 p-3 flex flex-col`}>
            <Bone className="h-3 w-52 mb-3 shrink-0" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-slate-50">
                <Bone className="h-4 w-6" />
                <Bone className="h-4 flex-1" />
                <Bone className="h-4 w-16" />
                <Bone className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2.5 min-h-0">
          <div className={`${card} p-3 flex-1 min-h-0`}>
            <Bone className="h-3 w-28 mb-3" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <Bone className="h-5 w-5" />
                <Bone className="h-3 flex-1" />
                <Bone className="h-3 w-6" />
              </div>
            ))}
          </div>
          <div className={`${card} p-3 flex-1 min-h-0`}>
            <Bone className="h-3 w-36 mb-3" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <Bone className="h-5 w-5" />
                <Bone className="h-3 flex-1" />
                <Bone className="h-3 w-6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TablePageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div className="space-y-1.5">
          <Bone className="h-4 w-36" />
          <Bone className="h-2.5 w-56" />
        </div>
        <Bone className="h-8 w-28" />
      </div>
      <div className={`${card} p-3 flex gap-2 shrink-0`}>
        <Bone className="h-8 flex-1" />
        <Bone className="h-8 w-24" />
        <Bone className="h-8 w-24" />
      </div>
      <div className={`${card} flex-1 min-h-0 overflow-hidden p-0`}>
        <div className="px-3 py-2 border-b border-slate-100 flex gap-3">
          {[40, 80, 60, 50, 70, 40].map((w, i) => (
            <Bone key={i} className="h-2.5" style={{ width: w } as CSSProperties} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-3 py-2.5 border-b border-slate-50 flex gap-3 items-center">
            {[40, 80, 60, 50, 70, 40].map((w, j) => (
              <Bone key={j} className="h-3" style={{ width: w } as CSSProperties} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PhysicianSummarySkeleton() {
  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0">
      <div className="space-y-1.5 shrink-0">
        <Bone className="h-4 w-40" />
        <Bone className="h-2.5 w-64" />
      </div>
      <div className="grid grid-cols-3 gap-2.5 shrink-0">
        {[0, 1, 2].map((i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className={`${card} flex-1 min-h-0 p-3`}>
        <Bone className="h-3 w-48 mb-3" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-slate-50">
            <Bone className="h-4 w-8" />
            <Bone className="h-4 flex-1" />
            <Bone className="h-4 w-16" />
            <Bone className="h-4 w-14" />
            <Bone className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PhysiciansSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0">
      <div className="space-y-1.5 shrink-0">
        <Bone className="h-4 w-28" />
        <Bone className="h-2.5 w-72" />
      </div>
      <div className={`${card} p-3 shrink-0`}>
        <Bone className="h-3 w-28 mb-2" />
        <div className="grid grid-cols-3 gap-2">
          <Bone className="h-8" />
          <Bone className="h-8" />
          <Bone className="h-8 w-20" />
        </div>
      </div>
      <div className={`${card} flex-1 min-h-0 p-3`}>
        <div className="flex justify-between mb-2">
          <Bone className="h-2.5 w-24" />
          <Bone className="h-7 w-32" />
        </div>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-slate-50">
            <Bone className="h-3 w-6" />
            <Bone className="h-3 flex-1" />
            <Bone className="h-3 w-28" />
            <Bone className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0">
      <div className="space-y-1.5 shrink-0">
        <Bone className="h-4 w-24" />
        <Bone className="h-2.5 w-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {[0, 1].map((i) => (
          <div key={i} className={`${card} p-3 space-y-2`}>
            <Bone className="h-3 w-32 mb-1" />
            <Bone className="h-8 w-full" />
            <Bone className="h-8 w-full" />
            <div className="grid grid-cols-2 gap-2">
              <Bone className="h-8" />
              <Bone className="h-8" />
            </div>
          </div>
        ))}
        <div className={`${card} p-3 lg:col-span-2 space-y-2`}>
          <Bone className="h-3 w-24" />
          <Bone className="h-2.5 w-40" />
          <div className="flex gap-2">
            <Bone className="h-8 w-24" />
            <Bone className="h-8 w-28" />
            <Bone className="h-8 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={`bg-white border-r border-slate-100 flex flex-col h-screen shrink-0 ${
        collapsed ? 'w-[64px]' : 'w-[220px]'
      }`}
    >
      <div className={`border-b border-slate-50 ${collapsed ? 'p-3' : 'px-3.5 py-3.5'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
          <Bone className="w-9 h-9 shrink-0" />
          {!collapsed && (
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-24" />
              <Bone className="h-2 w-20" />
            </div>
          )}
        </div>
      </div>
      <nav className={`flex-1 py-3 space-y-1.5 ${collapsed ? 'px-1.5' : 'px-2.5'}`}>
        {[0, 1, 2, 3].map((i) => (
          <Bone
            key={i}
            className={`h-9 ${collapsed ? 'w-full' : 'w-full'}`}
          />
        ))}
      </nav>
      <div className={`${collapsed ? 'px-1.5' : 'px-2.5'} pb-1`}>
        <Bone className="h-9 w-full" />
      </div>
      <div className={`border-t border-slate-100 ${collapsed ? 'p-3' : 'px-3.5 py-3'} space-y-2`}>
        {!collapsed && (
          <>
            <Bone className="h-2.5 w-full" />
            <Bone className="h-2.5 w-16 mx-auto" />
          </>
        )}
      </div>
    </aside>
  );
}

function HeaderSkeleton() {
  return (
    <header className="h-11 bg-white border-b border-slate-200 flex items-center justify-between px-3 shrink-0">
      <Bone className="h-8 max-w-md w-full" />
      <div className="flex items-center gap-2.5">
        <Bone className="w-7 h-7 rounded-md" />
        <Bone className="w-6 h-6 rounded-full" />
        <div className="hidden sm:block space-y-1">
          <Bone className="h-2.5 w-20" />
          <Bone className="h-2 w-14" />
        </div>
      </div>
    </header>
  );
}

export default function PageSkeleton({
  page,
  collapsed = false,
}: {
  page: Page;
  collapsed?: boolean;
}) {
  let body: ReactNode;
  switch (page) {
    case 'dashboard':
      body = <DashboardSkeleton />;
      break;
    case 'admission-log':
      body = <TablePageSkeleton rows={10} />;
      break;
    case 'physician-summary':
      body = <PhysicianSummarySkeleton />;
      break;
    case 'physicians':
      body = <PhysiciansSkeleton />;
      break;
    case 'settings':
      body = <SettingsSkeleton />;
      break;
    default:
      body = <DashboardSkeleton />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fb]">
      <SidebarSkeleton collapsed={collapsed} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <HeaderSkeleton />
        <main
          className={`flex-1 min-h-0 ${
            page === 'dashboard' ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <div className="h-full p-3">{body}</div>
        </main>
      </div>
    </div>
  );
}
