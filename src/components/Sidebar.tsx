import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UserCog,
  Settings,
  PanelLeftClose,
  PanelLeft,
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
  isAdmin: boolean;
  isDoctor?: boolean;
}

const mainNav: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'admission-log', label: 'Admission Log', icon: ClipboardList },
  { id: 'physician-summary', label: 'Physician Summary', icon: Users },
  { id: 'physicians', label: 'Physicians', icon: UserCog },
];

/** Smooth, modern collapse easing (close to Linear / Material standard) */
const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';
const duration = 'duration-300';

export default function Sidebar({
  currentPage,
  onNavigate,
  collapsed,
  onToggle,
  hospitalName,
  branch,
  isAdmin,
  isDoctor = false,
}: SidebarProps) {
  const navBtn = (id: Page, label: string, Icon: typeof LayoutDashboard) => {
    const isActive = currentPage === id;
    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        title={collapsed ? label : undefined}
        className={`
          group relative w-full flex items-center rounded-lg text-[12.5px] font-medium
          transition-[background-color,color,padding] ${duration}
          ${collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2 gap-2.5'}
          ${
            isActive
              ? 'bg-[#e8f8f0] text-[#0d9f6e] dark:bg-emerald-950 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
          }
        `}
        style={{ transitionTimingFunction: ease }}
      >
        <Icon
          size={16}
          strokeWidth={isActive ? 2.2 : 1.8}
          className={`shrink-0 transition-colors ${duration} ${
            isActive ? 'text-[#0d9f6e]' : 'text-slate-400 group-hover:text-slate-500'
          }`}
          style={{ transitionTimingFunction: ease }}
        />
        <span
          className={`
            overflow-hidden whitespace-nowrap transition-all ${duration}
            ${collapsed ? 'max-w-0 opacity-0 translate-x-1' : 'max-w-[160px] opacity-100 translate-x-0'}
          `}
          style={{ transitionTimingFunction: ease }}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <aside
      className={`
        relative bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-700
        flex flex-col h-full shrink-0 overflow-hidden
        transition-[width] ${duration}
        ${collapsed ? 'w-[64px]' : 'w-[220px]'}
      `}
      style={{ transitionTimingFunction: ease }}
    >
      {/* Collapse control — same horizontal alignment as nav icons */}
      <div
        className={`
          flex items-center pt-2.5 pb-1
          transition-[padding] ${duration}
          ${collapsed ? 'px-1.5 justify-center' : 'px-2.5'}
        `}
        style={{ transitionTimingFunction: ease }}
      >
        <button
          onClick={onToggle}
          type="button"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`
            flex items-center justify-center
            w-7 h-7 rounded-md shrink-0
            border border-slate-200 dark:border-slate-600
            bg-white dark:bg-slate-900
            text-slate-500 dark:text-slate-400
            hover:bg-slate-50 dark:hover:bg-slate-800
            hover:border-slate-300 dark:hover:border-slate-500
            hover:text-slate-700 dark:hover:text-slate-200
            transition-colors shadow-sm
            ${collapsed ? '' : 'ml-0'}
          `}
        >
          {collapsed ? (
            <PanelLeft size={14} strokeWidth={1.8} />
          ) : (
            <PanelLeftClose size={14} strokeWidth={1.8} />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav
        className={`
          flex-1 py-1.5 space-y-0.5 overflow-hidden
          transition-[padding] ${duration}
          ${collapsed ? 'px-1.5' : 'px-2.5'}
        `}
        style={{ transitionTimingFunction: ease }}
      >
        {mainNav
          .filter((item) => {
            if (item.id === 'dashboard' && !isAdmin) return false;
            if (item.id === 'physicians' && isDoctor) return false;
            return true;
          })
          .map((item) => navBtn(item.id, item.label, item.icon))}
      </nav>

      {/* Settings */}
      <div
        className={`
          pb-1 overflow-hidden transition-[padding] ${duration}
          ${collapsed ? 'px-1.5' : 'px-2.5'}
        `}
        style={{ transitionTimingFunction: ease }}
      >
        {navBtn('settings', 'Settings', Settings)}
      </div>

      {/* Footer */}
      <div
        className={`
          border-t border-slate-100 dark:border-slate-800 overflow-hidden
          transition-[padding] ${duration}
          ${collapsed ? 'px-1.5 py-3' : 'px-3.5 py-3'}
        `}
        style={{ transitionTimingFunction: ease }}
      >
        <div
          className={`
            space-y-2 transition-all ${duration}
            ${collapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-24 opacity-100'}
          `}
          style={{ transitionTimingFunction: ease }}
        >
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
            <span className="whitespace-nowrap">Data is secure & HIPAA compliant</span>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.1em] uppercase truncate">
              {branch}
            </p>
            <p className="text-[9px] text-slate-400 truncate">{hospitalName} Hospital</p>
          </div>
        </div>

        <div
          className={`
            flex flex-col items-center gap-1.5 transition-all ${duration}
            ${collapsed ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}
          `}
          style={{ transitionTimingFunction: ease }}
        >
          <ShieldCheck size={14} className="text-emerald-500" />
          <p className="text-[8px] font-bold text-slate-400">
            {branch.slice(0, 3).toUpperCase()}
          </p>
        </div>
      </div>
    </aside>
  );
}
