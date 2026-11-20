import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Profile = { name: string; email: string | null; phone: string | null; kind: string; status: string };

type AuthState = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  teamRole: '' | 'admin' | 'editor';
  recovering: boolean;
  signUp: (a: { name: string; email: string; phone: string; password: string }) => Promise<'signed-in' | 'confirm-email'>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  setNewPassword: (password: string) => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

const need = () => {
  if (!supabase) throw new Error('The database is not connected yet.');
  return supabase;
};

// Friendlier wording for the errors people meet most often.
export function niceError(e: unknown): string {
  const m = (e as { message?: string })?.message || String(e);
  if (/invalid login credentials/i.test(m)) return 'Email or password is not correct.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your email first. Check your inbox for the link we sent.';
  if (/already registered|already been registered/i.test(m)) return 'That email already has an account. Please sign in instead.';
  if (/password should be at least/i.test(m)) return 'Your password needs at least 8 characters.';
  if (/rate limit/i.test(m)) return 'Too many attempts. Please wait a minute and try again.';
  if (/failed to fetch|network/i.test(m)) return 'We could not reach the server. Check your internet connection and try again.';
  return m;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teamRole, setTeamRole] = useState<AuthState['teamRole']>('');
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Load the member's profile and team role whenever the signed-in person changes.
  const uid = session?.user.id;
  useEffect(() => {
    if (!supabase || !uid) { setProfile(null); setTeamRole(''); return; }
    let live = true;
    (async () => {
      const meta = session?.user.user_metadata || {};
      const { data } = await supabase.from('profiles').select('name,email,phone,kind,status').eq('user_id', uid).maybeSingle();
      if (live) setProfile(data ?? { name: meta.name || session?.user.email?.split('@')[0] || 'Member', email: session?.user.email ?? null, phone: meta.phone ?? null, kind: 'member', status: 'Active' });
      const admin = await supabase.rpc('is_app_admin', { min_role: 'admin' });
      if (!live) return;
      if (admin.data === true) return setTeamRole('admin');
      const editor = await supabase.rpc('is_app_admin', { min_role: 'editor' });
      if (live) setTeamRole(editor.data === true ? 'editor' : '');
    })();
    return () => { live = false; };
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: AuthState = {
    ready, session, profile, teamRole, recovering,
    async signUp({ name, email, phone, password }) {
      const { data, error } = await need().auth.signUp({
        email, password,
        options: { data: { name, phone }, emailRedirectTo: window.location.origin + '/account' },
      });
      if (error) throw error;
      // Supabase hides "already registered" when email confirmation is on: an existing user comes back with no identities.
      if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error('already registered');
      return data.session ? 'signed-in' : 'confirm-email';
    },
    async signIn(email, password) {
      const { error } = await need().auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
      setProfile(null); setTeamRole('');
    },
    async sendReset(email) {
      const { error } = await need().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' });
      if (error) throw error;
    },
    async setNewPassword(password) {
      const { error } = await need().auth.updateUser({ password });
      if (error) throw error;
      setRecovering(false);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

export const firstName = (n?: string | null) => String(n || '').trim().split(/\s+/)[0] || 'friend';
