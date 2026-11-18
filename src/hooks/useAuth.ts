import { useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserRole } from '../types';

export interface AuthProfile {
  id: string;
  fullName: string;
  role: UserRole;
  email: string;
  physicianId: string | null;
  physicianName: string | null;
}

// Unknown / missing role = least privilege (view-only, linked to no physician → sees nothing)
function parseRole(raw: unknown): UserRole {
  if (raw === 'admin') return 'admin';
  if (raw === 'staff') return 'staff';
  return 'doctor';
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfileUnsafe = useCallback(async (u: User) => {
    if (!supabase) {
      setProfile({
        id: u.id,
        fullName: u.email?.split('@')[0] || 'User',
        role: 'admin',
        email: u.email || '',
        physicianId: null,
        physicianName: null,
      });
      return;
    }

    const { data, error: qErr } = await supabase
      .from('profiles')
      .select('id, full_name, role, physician_id, physicians(name)')
      .eq('id', u.id)
      .maybeSingle();

    if (qErr) {
      console.error(qErr);
      // Fallback without join
      const { data: plain } = await supabase
        .from('profiles')
        .select('id, full_name, role, physician_id')
        .eq('id', u.id)
        .maybeSingle();

      setProfile({
        id: u.id,
        fullName: (plain?.full_name as string) || u.email?.split('@')[0] || 'User',
        role: parseRole(plain?.role),
        email: u.email || '',
        physicianId: (plain?.physician_id as string) || null,
        physicianName: null,
      });
      return;
    }

    if (!data) {
      setProfile({
        id: u.id,
        fullName: u.email?.split('@')[0] || 'User',
        role: 'doctor',
        email: u.email || '',
        physicianId: null,
        physicianName: null,
      });
      return;
    }

    const phy = data.physicians as { name?: string } | { name?: string }[] | null;
    let physicianName: string | null = null;
    if (Array.isArray(phy)) physicianName = phy[0]?.name ?? null;
    else if (phy && typeof phy === 'object') physicianName = phy.name ?? null;

    setProfile({
      id: data.id as string,
      fullName: (data.full_name as string) || u.email?.split('@')[0] || 'User',
      role: parseRole(data.role),
      email: u.email || '',
      physicianId: (data.physician_id as string) || null,
      physicianName,
    });
  }, []);

  /** Never leaves the app waiting forever: on any failure fall back to least privilege. */
  const loadProfile = useCallback(
    async (u: User) => {
      try {
        await loadProfileUnsafe(u);
      } catch (e) {
        console.error('Loading profile failed', e);
        setProfile({
          id: u.id,
          fullName: u.email?.split('@')[0] || 'User',
          role: 'doctor',
          email: u.email || '',
          physicianId: null,
          physicianName: null,
        });
      }
    },
    [loadProfileUnsafe]
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user).finally(() => {
          if (!cancelled) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // Ignore token refresh / tab focus — prevents full-page skeleton reload
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setSession(next);
        setUser(next?.user ?? null);
        return;
      }
      setSession(next);
      setUser(next?.user ?? null);
      if (event === 'SIGNED_OUT' || !next?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // A different person signed in → drop the previous user's profile right away
        const nextId = next.user.id;
        setProfile((prev) => (prev && prev.id === nextId ? prev : null));
        // Soft profile refresh — do not toggle global loading (avoids remount)
        void loadProfile(next.user);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    if (!supabase) {
      setError('Supabase is not configured.');
      return { ok: false as const };
    }
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authErr) {
      setError(authErr.message);
      return { ok: false as const };
    }
    return { ok: true as const };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  }, []);

  /** Change the signed-in user's own password. */
  const changePassword = useCallback(
    async (newPassword: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
      if (newPassword.length < 6) {
        return { ok: false, message: 'Password must be at least 6 characters.' };
      }
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) return { ok: false, message: updErr.message };
      return { ok: true };
    },
    []
  );

  const role = profile?.role;
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const isDoctor = role === 'doctor';

  return {
    session,
    user,
    profile,
    loading,
    error,
    setError,
    signIn,
    signOut,
    changePassword,
    isAuthenticated: Boolean(session && user),
    isAdmin,
    isStaff,
    isDoctor,
    physicianName: profile?.physicianName ?? null,
    usingSupabase: isSupabaseConfigured,
  };
}
