import type { Physician, PhysicianStaffType, PhysicianWriteFields } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

function asStaffType(v: unknown): PhysicianStaffType {
  const s = String(v || '').toLowerCase().trim();
  if (s === 'visiting') return 'Visiting';
  if (s === 'house physician' || s === 'house_physician' || s === 'house') return 'House Physician';
  return 'Active';
}

function toStaffTypeDb(t: PhysicianStaffType): string {
  if (t === 'Visiting') return 'Visiting';
  if (t === 'House Physician') return 'House Physician';
  return 'Active';
}

export function fromPhysicianRow(row: Record<string, unknown>): Physician {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    department: String(row.department ?? ''),
    staffType: asStaffType(row.staff_type),
    specialization: String(row.specialization ?? ''),
    subSpecialization: String(row.sub_specialization ?? ''),
    active: row.active !== false,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

/**
 * Loads EVERY physician row, including inactive ones (active = false).
 * Inactive doctors must stay resolvable so old admissions / entries still show their
 * department; pickers and the roster page filter on `active` themselves (see usePhysicians).
 */
export async function fetchPhysicians(): Promise<Physician[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('physicians')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => fromPhysicianRow(r as Record<string, unknown>));
}

/** Map physician_id → login email (from profiles) for admins */
export async function fetchPhysicianLoginMap(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('profiles')
    .select('physician_id')
    .eq('role', 'doctor')
    .not('physician_id', 'is', null);
  if (error) {
    console.error(error);
    return {};
  }
  const map: Record<string, string> = {};
  (data || []).forEach((row) => {
    const pid = row.physician_id as string;
    if (pid) map[pid] = 'linked';
  });
  return map;
}

export async function insertPhysician(fields: PhysicianWriteFields): Promise<Physician> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('physicians')
    .insert({
      name: fields.name.trim(),
      department: fields.department.trim(),
      staff_type: toStaffTypeDb(fields.staffType),
      specialization: (fields.specialization || '').trim(),
      sub_specialization: (fields.subSpecialization || '').trim(),
      active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return fromPhysicianRow(data as Record<string, unknown>);
}

export async function updatePhysician(
  id: string,
  fields: Partial<PhysicianWriteFields> & { active?: boolean }
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const payload: Record<string, unknown> = {};
  if (fields.name !== undefined) payload.name = fields.name.trim();
  if (fields.department !== undefined) payload.department = fields.department.trim();
  if (fields.staffType !== undefined) {
    payload.staff_type = toStaffTypeDb(fields.staffType);
  }
  if (fields.specialization !== undefined) {
    payload.specialization = fields.specialization.trim();
  }
  if (fields.subSpecialization !== undefined) {
    payload.sub_specialization = fields.subSpecialization.trim();
  }
  if (fields.active !== undefined) payload.active = fields.active;
  const { error } = await supabase.from('physicians').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deletePhysician(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('physicians').delete().eq('id', id);
  if (error) throw error;
}

async function restoreAdminSession(
  adminSession: { access_token: string; refresh_token: string } | null
) {
  if (!supabase || !adminSession?.access_token || !adminSession?.refresh_token) return;
  await supabase.auth.setSession({
    access_token: adminSession.access_token,
    refresh_token: adminSession.refresh_token,
  });
}

/**
 * Create Auth user + link profile as doctor → physician_id.
 * Restores the admin session afterward.
 */
export async function createDoctorLoginAccount(opts: {
  physicianId: string;
  physicianName: string;
  email: string;
  password: string;
}): Promise<{ userId: string }> {
  if (!supabase) throw new Error('Supabase not configured');

  const email = opts.email.trim().toLowerCase();
  const password = opts.password;

  if (!email || password.length < 6) {
    throw new Error('Email required and password must be at least 6 characters.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const adminSession = sessionData.session;

  // The doctor's account is confirmed by the admin right away (no email step).
  // If "Confirm email" is OFF in Supabase this is already true; if it is ON,
  // the admin_confirm_doctor() function (supabase/doctor_auto_confirm.sql) confirms it below.
  const { data: signData, error: signErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: opts.physicianName,
        role: 'doctor',
      },
      emailRedirectTo: undefined,
    },
  });

  if (signErr) throw signErr;

  const newUser = signData.user;
  if (!newUser?.id) {
    throw new Error('Could not create the account. Please try again.');
  }
  // With "Confirm email" ON, Supabase hides duplicates by returning a user with no identities
  if (Array.isArray(newUser.identities) && newUser.identities.length === 0) {
    await restoreAdminSession(
      adminSession
        ? { access_token: adminSession.access_token, refresh_token: adminSession.refresh_token }
        : null
    );
    throw new Error('This email is already registered. Use "Link existing account" instead.');
  }
  const newUserId = newUser.id;
  const alreadyConfirmed = !!newUser.email_confirmed_at;

  await restoreAdminSession(
    adminSession
      ? {
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        }
      : null
  );

  const { error: upErr } = await supabase.from('profiles').upsert(
    {
      id: newUserId,
      full_name: opts.physicianName,
      role: 'doctor',
      physician_id: opts.physicianId,
    },
    { onConflict: 'id' }
  );

  if (upErr) {
    throw new Error(
      `Account created but profile link failed: ${upErr.message}. Run doctor_accounts.sql.`
    );
  }

  if (!alreadyConfirmed) {
    const { error: confirmErr } = await supabase.rpc('admin_confirm_doctor', {
      p_user_id: newUserId,
    });
    if (confirmErr) {
      throw new Error(
        'Account created, but it could not be confirmed automatically, so the doctor cannot log in yet. ' +
          'Run supabase/doctor_auto_confirm.sql in Supabase (or turn off "Confirm email" in Authentication → Providers → Email). ' +
          `(${confirmErr.message})`
      );
    }
  }

  return { userId: newUserId };
}

/**
 * Link an existing Auth user (by email) to this physician as doctor.
 * Looks up profile via auth.users is not available from client — we match profiles
 * by requiring the user to already have logged in once OR we use a RPC.
 *
 * Practical approach: admin enters the exact email; we look up profiles joined is hard.
 * Alternative: store email on profiles (optional). Simpler approach for client:
 * use list from profiles where we add email column, OR ask admin to paste user UUID.
 *
 * Best client-safe approach without service role:
 * Add optional email on profiles updated on login, OR
 * Query: we cannot search auth.users from anon key.
 *
 * Use a security definer RPC that finds user by email and links.
 */
export async function linkExistingUserToPhysician(opts: {
  physicianId: string;
  physicianName: string;
  email: string;
}): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const email = opts.email.trim().toLowerCase();
  if (!email) throw new Error('Email is required to link an account.');

  // RPC preferred; falls back to error with SQL instructions if missing
  const { data, error } = await supabase.rpc('link_doctor_by_email', {
    p_email: email,
    p_physician_id: opts.physicianId,
    p_full_name: opts.physicianName,
  });

  if (error) {
    throw new Error(
      error.message.includes('Could not find the function')
        ? 'Run supabase/doctor_accounts.sql (includes link_doctor_by_email function).'
        : error.message
    );
  }

  if (data === false || data === null) {
    throw new Error(
      `No Auth user found for ${email}. Create the user in Supabase Auth first, or use "Create new account".`
    );
  }
}

export { isSupabaseConfigured };
