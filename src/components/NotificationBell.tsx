import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import type { AppNotification } from '../lib/notifications';

const READ_KEY = 'globalcare_notif_read_v1';

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids).slice(-200)));
}

export default function NotificationBell({ items }: { items: AppNotification[] }) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => items.filter((n) => !readIds.has(n.id)).length,
    [items, readIds]
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const markAllRead = () => {
    const next = new Set(readIds);
    items.forEach((n) => next.add(n.id));
    setReadIds(next);
    saveReadIds(next);
  };

  const markRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
  };

  const severityDot = (s: AppNotification['severity']) =>
    s === 'critical' ? 'bg-red-500' : s === 'warning' ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
        title="Notifications"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[320px] max-h-[360px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[10px] text-[#1348f3] font-medium hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <p className="text-[11px] text-slate-400 p-4 text-center">
                No alerts right now. You’re on track.
              </p>
            ) : (
              items.map((n) => {
                const unread = !readIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 ${
                      unread ? 'bg-blue-50/40 dark:bg-slate-800/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(n.severity)}`} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                          {n.title}
                          {unread && (
                            <span className="ml-1 text-[9px] text-[#1348f3] font-bold">NEW</span>
                          )}
                        </p>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {n.body}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <p className="text-[9px] text-slate-400 px-3 py-1.5 border-t border-slate-100 dark:border-slate-700">
            Live from admission data · updates automatically
          </p>
        </div>
      )}
    </div>
  );
}
