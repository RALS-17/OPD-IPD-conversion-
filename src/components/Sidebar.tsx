import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UserCog,
  Settings,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';
import type { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
  hospitalName: string;
  branch: string;
}

const mainNav: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'admission-log', label: 'Admission Log', icon: ClipboardList },
  { id: 'physician-summary', label: 'Physician Summary', icon: Users },
  { id: 'physicians', label: 'Physicians', icon: UserCog },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  collapsed,
  onToggle,
  hospitalName,
  branch,
}: SidebarProps) {
  const navBtn = (id: Page, label: string, Icon: typeof LayoutDashboard) => {
    const isActive = currentPage === id;
    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        title={collapsed ? label : undefined}
        className={`w-full flex items-center gap-2.5 rounded-lg text-[12.5px] font-medium transition-all ${
          collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2'
        } ${
          isActive
            ? 'bg-[#e8f8f0] text-[#0d9f6e]'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <Icon
          size={16}
          strokeWidth={isActive ? 2.2 : 1.8}
          className={isActive ? 'text-[#0d9f6e]' : 'text-slate-400'}
        />
        {!collapsed && label}
      </button>
    );
  };

  return (
    <aside
      className={`bg-white border-r border-slate-100 flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0 ${
        collapsed ? 'w-[64px]' : 'w-[220px]'
      }`}
    >
      <div
        className={`flex items-center border-b border-slate-50 ${
          collapsed ? 'px-2 py-3 justify-center' : 'px-3.5 py-3.5 gap-2.5'
        }`}
      >
        {!collapsed && (
          <>
            <img src="/logo.svg" alt="Logo" className="w-9 h-9 object-contain shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-[13.5px] font-bold text-slate-900 leading-tight underline decoration-[#1348f3] decoration-2 underline-offset-[3px] truncate">
                {hospitalName}
              </h1>
              <p className="text-[9.5px] text-slate-500 mt-0.5 font-medium tracking-wide truncate">
                OPD → IPD Monitor
              </p>
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-500 shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
          </>
        )}
        {collapsed && (
          <button onClick={onToggle} className="p-1 rounded-md hover:bg-slate-100" title="Expand">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
          </button>
        )}
      </div>

      <nav className={`flex-1 py-3 space-y-0.5 ${collapsed ? 'px-1.5' : 'px-2.5'}`}>
        {mainNav.map((item) => navBtn(item.id, item.label, item.icon))}
      </nav>

      {/* Settings just above footer */}
      <div className={`${collapsed ? 'px-1.5' : 'px-2.5'} pb-1`}>
        {navBtn('settings', 'Settings', Settings)}
      </div>

      <div className={`border-t border-slate-100 ${collapsed ? 'px-1.5 py-3' : 'px-3.5 py-3'}`}>
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
              <span>Data is secure & HIPAA compliant</span>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-500 tracking-[0.1em] uppercase">
                {branch}
              </p>
              <p className="text-[9px] text-slate-400">{hospitalName} Hospital</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <p className="text-[8px] font-bold text-slate-400">
              {branch.slice(0, 3).toUpperCase()}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
