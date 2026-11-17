import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { toast, errorMessage } from '../lib/toast';

export type DoctorAccountAction =
  | { mode: 'create'; email: string; password: string }
  | { mode: 'link'; email: string };

const STAFF_TYPE_FIX_SQL =
  'Supabase rejected staff_type. Run this in SQL Editor:\n\n' +
  'alter table public.physicians drop constraint if exists physicians_staff_type_check;\n' +
  'alter table public.physicians add constraint physicians_staff_type_check ' +
  "check (staff_type in ('Active', 'Visiting', 'House Physician'));";

function physicianErrorText(e: unknown, fallback: string): string {
  const msg = errorMessage(e, fallback);
  if (
    msg.includes('staff_type') ||
    msg.includes('specialization') ||
    msg.includes('physicians_staff_type_check')
  ) {
    return `${STAFF_TYPE_FIX_SQL}\n\n${msg}`;
  }
  return msg;
}

export function usePhysicians() {
  /** Every row, including inactive – used for name → department lookups */
  const [allPhysicians, setPhysicians] = useState<Physician[]>([]);
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

  /** Pickers, roster page and rosters use active doctors only */
  const physicians = useMemo(() => allPhysicians.filter((p) => p.active), [allPhysicians]);

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

  /**
   * Returns true when the physician row was saved (so the form can reset), false when it failed.
   * If the roster row saved but the login step failed, the row exists → returns true and a
   * toast explains the login problem (retry it from Edit; re-adding would create a duplicate).
   */
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
    ): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        toast.error('Connect Supabase first (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).');
        return false;
      }
      let row: Physician;
      try {
        row = await insertPhysician(fields);
      } catch (e) {
        console.error(e);
        toast.error(physicianErrorText(e, 'Failed to add physician.'));
        return false;
      }
      setPhysicians((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
      try {
        await applyAccount(row.id, row.name, account);
      } catch (e) {
        console.error(e);
        toast.error(
          `${row.name} was added to the roster, but the login was not created.\n` +
            `Open Edit on this physician to retry the login.\n${physicianErrorText(e, 'Login setup failed.')}`
        );
      }
      return true;
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

  /** Returns true when everything (including the optional login) saved. */
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
    ): Promise<boolean> => {
      if (!isSupabaseConfigured) return false;
      try {
        await updatePhysician(id, fields);
      } catch (e) {
        console.error(e);
        toast.error(physicianErrorText(e, 'Failed to update physician.'));
        return false;
      }
      setPhysicians((prev) =>
        prev
          .map((p) => (p.id === id ? { ...p, ...fields } : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      try {
        await applyAccount(id, fields.name, account);
      } catch (e) {
        console.error(e);
        toast.error(
          `Physician details were saved, but the login step failed.\n${physicianErrorText(e, 'Login setup failed.')}`
        );
        return false; // keep the edit row open so the login can be retried
      }
      return true;
    },
    []
  );

  const removePhysician = useCallback(async (id: string): Promise<boolean> => {
    if (!isSupabaseConfigured) return false;
    try {
      await deletePhysician(id);
    } catch (e) {
      console.error(e);
      toast.error(`Could not delete the physician. They are still on the roster.\n${errorMessage(e)}`);
      return false;
    }
    setPhysicians((prev) => prev.filter((p) => p.id !== id));
    setLoginLinked((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    return true;
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
    allPhysicians,
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
