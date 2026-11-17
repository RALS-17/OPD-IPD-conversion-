/**
 * Tiny global toast store (no provider needed).
 * Call from anywhere: toast.error('…'), toast.success('…'), toast.info('…').
 * <Toaster /> (mounted once in App) renders them.
 */

export type ToastKind = 'error' | 'success' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (items: ToastItem[]) => void;

const MAX_VISIBLE = 4;
const DURATION: Record<ToastKind, number> = {
  error: 8000,
  success: 3500,
  info: 5000,
};

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  const snapshot = items;
  listeners.forEach((l) => l(snapshot));
}

export function dismissToast(id: number) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  items = items.filter((i) => i.id !== id);
  emit();
}

function push(kind: ToastKind, message: string) {
  const text = (message || '').trim();
  if (!text) return;
  // Same message already showing → don't stack duplicates
  if (items.some((i) => i.kind === kind && i.message === text)) return;
  const id = nextId++;
  items = [...items, { id, kind, message: text }].slice(-MAX_VISIBLE);
  timers.set(
    id,
    setTimeout(() => dismissToast(id), DURATION[kind])
  );
  emit();
}

export const toast = {
  error: (message: string) => push('error', message),
  success: (message: string) => push('success', message),
  info: (message: string) => push('info', message),
};

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

/** Best-effort readable text from anything thrown (Error, Supabase error object, string). */
export function errorMessage(e: unknown, fallback = 'Something went wrong.'): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string' && e) return e;
  const m = (e as { message?: unknown } | null)?.message;
  if (typeof m === 'string' && m) return m;
  return fallback;
}
