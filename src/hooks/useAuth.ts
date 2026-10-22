import { useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserRole } from '../types';

export interface AuthProfile {
  id: string;
  fullName: string;
  role: UserRole;
  email: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (u: User) => {
    if (!supabase) {
      setProfile({
        id: u.id,
        fullName: u.email?.split('@')[0] || 'User',
        role: 'admin',
        email: u.email || '',
      });
      return;
    }
    const { data, error: qErr } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', u.id)
      .maybeSingle();

    if (qErr) {
      console.error(qErr);
      setProfile({
        id: u.id,
        fullName: u.email?.split('@')[0] || 'User',
        role: 'staff',
        email: u.email || '',
      });
      return;
    }

    if (!data) {
      // Profile missing — treat as staff until admin sets role
      setProfile({
        id: u.id,
        fullName: u.email?.split('@')[0] || 'User',
        role: 'staff',
        email: u.email || '',
      });
      return;
    }

    setProfile({
      id: data.id as string,
      fullName: (data.full_name as string) || u.email?.split('@')[0] || 'User',
      role: data.role === 'admin' ? 'admin' : 'staff',
      email: u.email || '',
    });
  }, []);

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

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      if (next?.user) {
        setLoading(true);
        loadProfile(next.user).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
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

  return {
    session,
    user,
    profile,
    loading,
    error,
    setError,
    signIn,
    signOut,
    isAuthenticated: Boolean(session && user),
    isAdmin: profile?.role === 'admin',
    isStaff: profile?.role === 'staff',
    usingSupabase: isSupabaseConfigured,
  };
}
