import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast, errorMessage } from '../lib/toast';

const STORAGE_KEY = 'globalcare_settings_v2';
const SAVE_DELAY_MS = 800;

/** Settings shared by everyone (stored in the database, only admins can change them). */
const SHARED_KEYS = [
  'hospitalName',
  'branch',
  'targetConversion',
  'goodThreshold',
  'averageThreshold',
] as const;
type SharedKey = (typeof SHARED_KEYS)[number];

function pickShared(s: AppSettings): Pick<AppSettings, SharedKey> {
  return {
    hospitalName: s.hospitalName,
    branch: s.branch,
    targetConversion: s.targetConversion,
    goodThreshold: s.goodThreshold,
    averageThreshold: s.averageThreshold,
  };
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sharedFromRow(row: Record<string, unknown>): Partial<AppSettings> {
  const out: Partial<AppSettings> = {};
  if (typeof row.hospital_name === 'string' && row.hospital_name.trim())
    out.hospitalName = row.hospital_name;
  if (typeof row.branch === 'string') out.branch = row.branch;
  if (row.target_conversion != null)
    out.targetConversion = num(row.target_conversion, DEFAULT_SETTINGS.targetConversion);
  if (row.good_threshold != null)
    out.goodThreshold = num(row.good_threshold, DEFAULT_SETTINGS.goodThreshold);
  if (row.average_threshold != null)
    out.averageThreshold = num(row.average_threshold, DEFAULT_SETTINGS.averageThreshold);
  return out;
}

/**
 * App settings.
 *  - theme: per user, kept in this browser.
 *  - hospital name / branch / targets: shared through the `app_settings` table so every user
 *    and every device sees the same values. Only admins (canEditShared) can change them.
 *  - If the table does not exist yet, everything keeps working from this browser's copy.
 *
 * `enabled` = the user is signed in (the shared values can only be read after sign-in).
 */
export function useSettings(enabled: boolean, canEditShared: boolean) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [localLoaded, setLocalLoaded] = useState(false);
  const [remoteDone, setRemoteDone] = useState(false);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const canEditRef = useRef(canEditShared);
  canEditRef.current = canEditShared;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Local copy (theme + offline cache of the shared values)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<AppSettings> & Record<string, unknown>;
        // Drop legacy keys that no longer exist (physicians list, admin display name/role)
        delete parsed.physicians;
        delete parsed.adminName;
        delete parsed.adminRole;
        setSettings({ ...DEFAULT_SETTINGS, ...(parsed as Partial<AppSettings>) });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
    setLocalLoaded(true);
  }, []);

  useEffect(() => {
    if (localLoaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, localLoaded]);

  // 2. Shared values from the database (after sign-in)
  useEffect(() => {
    if (!localLoaded) return;
    if (!enabled || !isSupabaseConfigured || !supabase) {
      setRemoteDone(true);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setRemoteDone(false);
    (async () => {
      try {
        const { data, error } = await client
          .from('app_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled && data) {
          setSettings((prev) => ({ ...prev, ...sharedFromRow(data as Record<string, unknown>) }));
        }
      } catch (e) {
        // Table not created yet (or no access): keep using this browser's copy
        console.warn('app_settings not available, using local settings', e);
      } finally {
        if (!cancelled) setRemoteDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, localLoaded]);

  // 3. Live updates for non-admins when an admin changes the shared values
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !supabase || canEditShared) return;
    const client = supabase;
    const channel = client
      .channel('app-settings-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            setSettings((prev) => ({
              ...prev,
              ...sharedFromRow(payload.new as Record<string, unknown>),
            }));
          }
        }
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled, canEditShared]);

  const flushSave = useCallback(async () => {
    timer.current = null;
    if (!canEditRef.current || !isSupabaseConfigured || !supabase) return;
    const s = pickShared(settingsRef.current);
    try {
      const { error } = await supabase.from('app_settings').upsert({
        id: 1,
        hospital_name: s.hospitalName,
        branch: s.branch,
        target_conversion: s.targetConversion,
        good_threshold: s.goodThreshold,
        average_threshold: s.averageThreshold,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Settings saved for all users.');
    } catch (e) {
      console.error('Saving app_settings failed', e);
      toast.error(
        `Could not save the shared settings (they are kept on this browser only).\n` +
          `If this is the first time, run supabase/app_settings.sql in the Supabase SQL Editor.\n${errorMessage(e)}`
      );
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (!isSupabaseConfigured) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushSave(), SAVE_DELAY_MS);
  }, [flushSave]);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void flushSave(); // don't lose a pending edit when leaving the page
      }
    },
    [flushSave]
  );

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      const next: Partial<AppSettings> = { ...partial };
      const touchesShared = SHARED_KEYS.some((k) => k in partial);
      if (touchesShared && !canEditRef.current) {
        // Only admins may change shared values; everyone may still change their own theme
        SHARED_KEYS.forEach((k) => delete next[k]);
      }
      setSettings((prev) => ({ ...prev, ...next }));
      if (touchesShared && canEditRef.current) scheduleSave();
    },
    [scheduleSave]
  );

  const resetSettings = useCallback(() => {
    if (canEditRef.current) {
      setSettings(DEFAULT_SETTINGS);
      scheduleSave();
    } else {
      // Non-admins only reset their own preference (theme)
      setSettings((prev) => ({ ...prev, theme: DEFAULT_SETTINGS.theme }));
    }
  }, [scheduleSave]);

  return {
    settings,
    updateSettings,
    resetSettings,
    loaded: localLoaded && remoteDone,
  };
}
