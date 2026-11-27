// Shared pieces for the admin portal.
import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { supabase } from '../../lib/supabase';
import { courseById, dollars, naira } from '../../data/site';

export const db = () => {
  if (!supabase) throw new Error('The database is not connected yet.');
  return supabase;
};

/** Loads something from Supabase; gives back the data, any error and a reload function. */
export function useLoad<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [n, setN] = useState(0);
  const reload = useCallback(() => setN((x) => x + 1), []);
  useEffect(() => {
    let live = true;
    setError('');
    fn().then((d) => { if (live) setData(d); }).catch((e) => { if (live) setError(e?.message || String(e)); });
    return () => { live = false; };
  }, [...deps, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, reload };
}

/** Runs a Supabase query and throws its error, so callers can use try/catch. */
export async function q<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export const money = (n: number, cur?: string | null) => (cur === 'USD' ? dollars(Number(n)) : naira(Number(n)));
export const courseName = (id: string) => courseById(id)?.title || id;
export const day = (t?: string | null) => (t ? new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
export const dayTime = (t?: string | null) => (t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }) : '–');

// Lagos is UTC+1 all year, so the date-and-time boxes work in Lagos time.
export const toLocalInput = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() + 3600000).toISOString().slice(0, 16) : '');
export const fromLocalInput = (v: string) => (v ? new Date(v + ':00+01:00').toISOString() : null);

export type Named = { user_id: string; name: string; email: string | null; phone: string | null };
/** Names and emails for a set of member ids (admins can read every profile). */
export async function namesFor(ids: (string | null | undefined)[]): Promise<Record<string, Named>> {
  const u = [...new Set(ids.filter(Boolean))] as string[];
  if (!u.length) return {};
  const { data } = await db().from('profiles').select('user_id,name,email,phone').in('user_id', u);
  return Object.fromEntries(((data || []) as Named[]).map((p) => [p.user_id, p]));
}

export function Loading({ error, what }: { error?: string; what: string }) {
  return <div className="card empty">{error ? `We could not load ${what}. ${error}` : `Loading ${what}…`}</div>;
}

/** Renders an object of form answers as label / value lines. */
export function Details({ d }: { d: Record<string, unknown> }) {
  const label = (k: string) => ({ desc: 'What is happening', decision: 'Decision needed', orgType: 'Type of organisation', svc: 'Service', what: 'What is going on', result: 'A good result', msg: 'Message', to_name: 'Introduce to', why: 'Why them', qual: 'Qualification', link: 'Profile link', years: 'Years of experience' } as Record<string, string>)[k] || k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const rows = Object.entries(d).filter(([k, v]) => v !== '' && v != null && k !== 'to_profile');
  if (!rows.length) return null;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {rows.map(([k, v]) => <div key={k}><div className="small muted">{label(k)}</div><div style={{ whiteSpace: 'pre-line' }}>{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</div></div>)}
    </div>
  );
}
