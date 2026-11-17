import { useState, useEffect, useCallback } from 'react';
import type { Physician, PhysicianStaffType } from '../types';
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
      fields: {
        name: string;
        department: string;
        staffType: PhysicianStaffType;
        specialization: string;
        subSpecialization: string;
      },
      account?: DoctorAccountAction | null
    ) => {
      if (!isSupabaseConfigured) {
        alert('Connect Supabase first (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).');
        return;
      }
      try {
        const row = await insertPhysician(fields);
        setPhysicians((prev) =>
          [...prev, row].sort((a, b) => a.name.localeCompare(b.name))
        );
        await applyAccount(row.id, row.name, account);
      } catch (e) {
        console.error(e);
        alert(
          e instanceof Error
            ? e.message.includes('staff_type') ||
                e.message.includes('specialization') ||
                e.message.includes('physicians_staff_type_check')
              ? 'Supabase rejected staff_type. Run this in SQL Editor:\n\n' +
                "alter table public.physicians drop constraint if exists physicians_staff_type_check;\n" +
                "alter table public.physicians add constraint physicians_staff_type_check " +
                "check (staff_type in ('Active', 'Visiting', 'House Physician'));\n\n" +
                e.message
              : e.message
            : 'Failed to add physician.'
        );
      }
    },
    []
  );

  /**
   * Quick-add used by the Daily Entries window: name only, everything else NA.
   * Returns the new row (or throws) so the caller knows whether it worked.
   */
  const createPhysicianByName = useCallback(async (name: string): Promise<Physician> => {
    if (!isSupabaseConfigured) {
      throw new Error('Connect Supabase first (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).');
    }
    const row = await insertPhysician({
      name: name.trim(),
      department: 'NA',
      staffType: 'Active',
      specialization: '',
      subSpecialization: '',
    });
    setPhysicians((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    return row;
  }, []);

  const editPhysician = useCallback(
    async (
      id: string,
      fields: {
        name: string;
        department: string;
        staffType: PhysicianStaffType;
        specialization: string;
        subSpecialization: string;
      },
      account?: DoctorAccountAction | null
    ) => {
      if (!isSupabaseConfigured) return;
      try {
        await updatePhysician(id, fields);
        setPhysicians((prev) =>
          prev
            .map((p) => (p.id === id ? { ...p, ...fields } : p))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        await applyAccount(id, fields.name, account);
      } catch (e) {
        console.error(e);
        alert(
          e instanceof Error
            ? e.message.includes('staff_type') ||
                e.message.includes('specialization') ||
                e.message.includes('physicians_staff_type_check')
              ? 'Supabase rejected staff_type. Run this in SQL Editor:\n\n' +
                "alter table public.physicians drop constraint if exists physicians_staff_type_check;\n" +
                "alter table public.physicians add constraint physicians_staff_type_check " +
                "check (staff_type in ('Active', 'Visiting', 'House Physician'));\n\n" +
                e.message
              : e.message
            : 'Failed to update physician.'
        );
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

  /** OPD / Admitting roster — excludes House Physician */
  const physicianNames = physicians
    .filter((p) => p.staffType !== 'House Physician')
    .map((p) => p.name);

  /** House Physician roster only */
  const housePhysicianNames = physicians
    .filter((p) => p.staffType === 'House Physician')
    .map((p) => p.name);

  return {
    physicians,
    physicianNames,
    housePhysicianNames,
    loginLinked,
    addPhysician,
    createPhysicianByName,
    editPhysician,
    removePhysician,
    reload,
    loaded,
    error,
    usingSupabase: isSupabaseConfigured,
  };
}
