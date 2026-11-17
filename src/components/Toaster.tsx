import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { subscribeToasts, dismissToast, type ToastItem, type ToastKind } from '../lib/toast';

const STYLE: Record<ToastKind, string> = {
  error:
    'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-900 dark:text-red-200',
  success:
    'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-200',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100',
};

function Icon({ kind }: { kind: ToastKind }) {
  if (kind === 'error') return <AlertCircle size={15} className="shrink-0 mt-px" />;
  if (kind === 'success') return <CheckCircle2 size={15} className="shrink-0 mt-px" />;
  return <Info size={15} className="shrink-0 mt-px" />;
}

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed bottom-3 right-3 z-[100] flex flex-col gap-2 w-[min(380px,calc(100vw-1.5rem))] pointer-events-none"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-start gap-2 border rounded-lg shadow-lg px-3 py-2.5 text-[12px] leading-snug ${STYLE[t.kind]}`}
        >
          <Icon kind={t.kind} />
          <p className="flex-1 min-w-0 whitespace-pre-line break-words">{t.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className="shrink-0 opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
