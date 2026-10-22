import { useState, useEffect, useCallback } from 'react';
import type { Physician } from '../types';
import {
  isSupabaseConfigured,
  fetchPhysicians,
  fetchPhysicianLoginMap,
  insertPhysician,
  updatePhysician,
  deletePhysician,
  createDoctorLoginAccount,
  linkExistingUserToPhysician,
} from '../lib/physiciansApi';
import { supabase } from '../lib/supabase';

export type DoctorAccountAction =
  | { mode: 'create'; email: string; password: string }
  | { mode: 'link'; email: string };

export function usePhysicians() {
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [loginLinked, setLoginLinked] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setPhysicians([]);
      setLoginLinked({});
      setLoaded(true);
      setError(null);
      return;
    }
    try {
      const [rows, links] = await Promise.all([
        fetchPhysicians(),
        fetchPhysicianLoginMap(),
      ]);
      setPhysicians(rows);
      setLoginLinked(links);
      setError(null);
    } catch (e) {
      console.error(e);
      setError('Failed to load physicians from database');
      setPhysicians([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    const channel = client
      .channel('physicians-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'physicians' },
        () => {
          void reload();
        }
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [reload]);

  const applyAccount = async (
    physicianId: string,
    physicianName: string,
    account?: DoctorAccountAction | null
  ) => {
    if (!account) return;
    if (account.mode === 'create') {
      await createDoctorLoginAccount({
        physicianId,
        physicianName,
        email: account.email,
        password: account.password,
      });
    } else {
      await linkExistingUserToPhysician({
        physicianId,
        physicianName,
        email: account.email,
      });
    }
    setLoginLinked((prev) => ({ ...prev, [physicianId]: 'linked' }));
  };

  const addPhysician = useCallback(
    async (
      name: string,
      department: string,
      account?: DoctorAccountAction | null
    ) => {
      if (!isSupabaseConfigured) {
        alert('Connect Supabase first (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).');
        return;
      }
      try {
        const row = await insertPhysician(name, department);
        setPhysicians((prev) =>
          [...prev, row].sort((a, b) => a.name.localeCompare(b.name))
        );
        await applyAccount(row.id, row.name, account);
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : 'Failed to add physician.');
      }
    },
    []
  );

  const editPhysician = useCallback(
    async (
      id: string,
      name: string,
      department: string,
      account?: DoctorAccountAction | null
    ) => {
      if (!isSupabaseConfigured) return;
      try {
        await updatePhysician(id, { name, department });
        setPhysicians((prev) =>
          prev
            .map((p) => (p.id === id ? { ...p, name, department } : p))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        await applyAccount(id, name, account);
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : 'Failed to update physician.');
      }
    },
    []
  );

  const removePhysician = useCallback(async (id: string) => {
    if (!isSupabaseConfigured) return;
    try {
      await deletePhysician(id);
      setPhysicians((prev) => prev.filter((p) => p.id !== id));
      setLoginLinked((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      console.error(e);
      alert('Failed to delete physician.');
    }
  }, []);

  const physicianNames = physicians.map((p) => p.name);

  return {
    physicians,
    physicianNames,
    loginLinked,
    addPhysician,
    editPhysician,
    removePhysician,
    reload,
    loaded,
    error,
    usingSupabase: isSupabaseConfigured,
  };
}
