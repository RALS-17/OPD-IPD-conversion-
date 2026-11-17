import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  fetchDailyEntries,
  saveDailyEntriesForDate,
  type DailyEntryRowInput,
  type PhysicianDailyEntry,
} from '../lib/physicianDailyEntries';

export function useDailyEntries() {
  const [entries, setEntries] = useState<PhysicianDailyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const rows = await fetchDailyEntries();
      setEntries(rows);
      setError(null);
    } catch (e) {
      console.error('Failed to load physician_daily_entries', e);
      setError(
        'Could not load daily entries. Run supabase/physician_daily_entries.sql in the Supabase SQL Editor.'
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Live updates from other devices (debounced: one save touches many rows)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    const channel = client
      .channel('physician-daily-entries-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'physician_daily_entries' },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void reload(), 700);
        }
      )
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void client.removeChannel(channel);
    };
  }, [reload]);

  /** Save one date for many doctors at once. Throws if the database rejects it. */
  const saveDay = useCallback(async (date: string, rows: DailyEntryRowInput[]) => {
    const { upserted, cleared } = await saveDailyEntriesForDate(date, rows);
    const touched = new Set([...upserted.map((e) => e.physician), ...cleared]);
    setEntries((prev) => [
      ...prev.filter((e) => !(e.date === date && touched.has(e.physician))),
      ...upserted,
    ]);
  }, []);

  return { entries, loaded, error, reload, saveDay };
}
