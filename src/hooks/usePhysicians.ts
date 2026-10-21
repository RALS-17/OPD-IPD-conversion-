import { useState, useEffect, useCallback } from 'react';
import type { Physician } from '../types';
import {
  isSupabaseConfigured,
  fetchPhysicians,
  insertPhysician,
  updatePhysician,
  deletePhysician,
} from '../lib/physiciansApi';

export function usePhysicians() {
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setPhysicians([]);
      setLoaded(true);
      setError(null);
      return;
    }
    try {
      const rows = await fetchPhysicians();
      setPhysicians(rows);
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

  const addPhysician = useCallback(
    async (name: string, department: string) => {
      if (!isSupabaseConfigured) {
        alert('Connect Supabase first (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).');
        return;
      }
      try {
        const row = await insertPhysician(name, department);
        setPhysicians((prev) =>
          [...prev, row].sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch (e) {
        console.error(e);
        alert('Failed to add physician. Check Supabase.');
      }
    },
    []
  );

  const editPhysician = useCallback(
    async (id: string, name: string, department: string) => {
      if (!isSupabaseConfigured) return;
      try {
        await updatePhysician(id, { name, department });
        setPhysicians((prev) =>
          prev
            .map((p) => (p.id === id ? { ...p, name, department } : p))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch (e) {
        console.error(e);
        alert('Failed to update physician.');
      }
    },
    []
  );

  const removePhysician = useCallback(async (id: string) => {
    if (!isSupabaseConfigured) return;
    try {
      await deletePhysician(id);
      setPhysicians((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      alert('Failed to delete physician.');
    }
  }, []);

  const physicianNames = physicians.map((p) => p.name);

  return {
    physicians,
    physicianNames,
    addPhysician,
    editPhysician,
    removePhysician,
    reload,
    loaded,
    error,
    usingSupabase: isSupabaseConfigured,
  };
}
