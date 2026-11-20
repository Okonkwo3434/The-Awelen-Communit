import { supabase } from './supabase';

// What this browser remembers about the visitor (so we can say "welcome back").
export type VisitorNote = { name: string; email: string; phone?: string; interest?: string; t: number };

const VISK = 'awelen-visitor-v1';
const SKIPK = 'awelen-exit-skip';

const get = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const set = (k: string, v: unknown) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off */ } };

export const rememberedVisitor = () => get<VisitorNote | null>(VISK, null);
export const rememberVisitor = (v: VisitorNote) => set(VISK, v);

export const exitSnoozed = () => get<number>(SKIPK, 0) > Date.now();
export const snoozeExit = (days = 3) => set(SKIPK, Date.now() + days * 864e5);

export const okEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

/** Saves the visitor in Supabase. Returns 'new', 'returning', or 'offline' if the database could not be reached. */
export async function registerVisitor(v: VisitorNote): Promise<'new' | 'returning' | 'offline'> {
  if (!supabase) return 'offline';
  const { data, error } = await supabase.rpc('register_visitor', {
    p_name: v.name, p_email: v.email, p_phone: v.phone || null, p_interest: v.interest || null, p_page: location.pathname,
  });
  if (error) { console.warn('register_visitor:', error.message); return 'offline'; }
  return data === 'returning' ? 'returning' : 'new';
}

/** Counts a return visit from someone who signed up before, once per browser session. */
export function logReturnVisit() {
  const v = rememberedVisitor();
  try {
    if (!v || sessionStorage.getItem('awelen-visit-logged')) return;
    sessionStorage.setItem('awelen-visit-logged', '1');
  } catch { return; }
  registerVisitor(v);
}
