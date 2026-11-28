// Phase 4: posts, events, enquiries (every form in the special spaces), affiliates, member database and eBooks.
// Every rule about who may read or write lives in Supabase (supabase/migrations/20261127_phase4_community.sql).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

const db = () => {
  if (!supabase) throw new Error('The database is not connected yet.');
  return supabase;
};

/* ---------- Posts, comments and likes ---------- */
export type Comment = { id: string; post_id: string; user_id: string | null; author_name: string; is_creator: boolean; body: string; created_at: string };
export type Post = {
  id: string; space: string; user_id: string | null; author_name: string; is_creator: boolean; body: string;
  pinned: boolean; likes: number; created_at: string; comments: Comment[]; liked: boolean;
};

export function usePosts(space: string) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!supabase) { setPosts([]); setLoading(false); return; }
    const { data, error: e } = await supabase.from('posts').select('*').eq('space', space)
      .order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(100);
    if (e) { setError(e.message); setLoading(false); return; }
    const ids = (data || []).map((p) => p.id as string);
    const [c, l] = await Promise.all([
      ids.length ? supabase.from('post_comments').select('*').in('post_id', ids).order('created_at') : Promise.resolve({ data: [] }),
      ids.length && uid ? supabase.from('post_likes').select('post_id').in('post_id', ids) : Promise.resolve({ data: [] }),
    ]);
    const liked = new Set(((l.data || []) as { post_id: string }[]).map((x) => x.post_id));
    const byPost: Record<string, Comment[]> = {};
    ((c.data || []) as Comment[]).forEach((x) => { (byPost[x.post_id] ||= []).push(x); });
    setPosts((data || []).map((p) => ({ ...(p as Post), comments: byPost[p.id] || [], liked: liked.has(p.id) })));
    setError(''); setLoading(false);
  }, [space, uid]);

  useEffect(() => { refresh(); }, [refresh]);
  return { posts, loading, error, refresh };
}

export async function createPost(space: string, body: string) {
  const { error } = await db().from('posts').insert({ space, body });
  if (error) throw error;
}
export async function deletePost(id: string) {
  const { error } = await db().from('posts').delete().eq('id', id);
  if (error) throw error;
}
export async function setPinned(id: string, pinned: boolean) {
  const { error } = await db().from('posts').update({ pinned }).eq('id', id);
  if (error) throw error;
}
export async function addComment(post_id: string, body: string) {
  const { error } = await db().from('post_comments').insert({ post_id, body });
  if (error) throw error;
}
export async function deleteComment(id: string) {
  const { error } = await db().from('post_comments').delete().eq('id', id);
  if (error) throw error;
}
export async function toggleLike(post_id: string, liked: boolean) {
  const q = liked ? db().from('post_likes').delete().eq('post_id', post_id) : db().from('post_likes').insert({ post_id });
  const { error } = await q;
  if (error && !/duplicate key/i.test(error.message)) throw error;
}

/* ---------- Events and bookings ---------- */
export type EventRow = {
  id: string; space: string; title: string; starts_at: string; mins: number; host: string; description: string;
  seats: number; price: number; currency: 'NGN' | 'USD'; taken: number;
};
export type Booking = { event_id: string; status: 'booked' | 'awaiting payment' | 'paid' | 'cancelled' };

export function useEvents(space: string) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [events, setEvents] = useState<EventRow[]>([]);
  const [mine, setMine] = useState<Record<string, Booking['status']>>({});
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase.from('events').select('*').eq('space', space).order('starts_at');
    const evs = (data || []) as EventRow[];
    setEvents(evs);
    if (uid && evs.length) {
      const b = await supabase.from('event_bookings').select('event_id,status').in('event_id', evs.map((e) => e.id));
      const m: Record<string, Booking['status']> = {};
      ((b.data || []) as Booking[]).forEach((x) => { if (x.status !== 'cancelled') m[x.event_id] = x.status; });
      setMine(m);
    } else setMine({});
    setLoading(false);
  }, [space, uid]);
  useEffect(() => { refresh(); }, [refresh]);
  return { events, mine, loading, refresh };
}

export async function bookEvent(id: string): Promise<Booking['status']> {
  const { data, error } = await db().rpc('book_event', { p_event: id });
  if (error) throw error;
  return data as Booking['status'];
}
export async function cancelBooking(id: string) {
  const { error } = await db().rpc('cancel_event_booking', { p_event: id });
  if (error) throw error;
}

/* ---------- Enquiries: one inbox for every form ---------- */
export type EnquiryKind = 'challenge' | 'eoi' | 'consult' | 'coaching' | 'cohort' | 'faculty' | 'corporate' | 'brief' | 'intro' | 'creator';
export type Enquiry = { id: string; kind: EnquiryKind; ref: string; name: string; org: string | null; role: string | null; details: Record<string, unknown>; status: string; created_at: string };

/** Sends a form. Visitors who are not signed in can send too (they just can't read it back). */
export async function sendEnquiry(e: { kind: EnquiryKind; name: string; email: string; phone?: string; org?: string; role?: string; details: Record<string, unknown> }) {
  const row = {
    kind: e.kind, name: e.name.trim().slice(0, 160), email: e.email.trim().toLowerCase().slice(0, 200),
    phone: e.phone?.trim() || null, org: e.org?.trim() || null, role: e.role?.trim() || null, details: e.details,
  };
  const { error } = await db().from('enquiries').insert(row);
  if (error) throw error;
}

export function useMyEnquiries(kinds: EnquiryKind[], bump = 0) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const key = kinds.join(',');
  const [rows, setRows] = useState<Enquiry[]>([]);
  useEffect(() => {
    if (!supabase || !uid) { setRows([]); return; }
    supabase.from('enquiries').select('id,kind,ref,name,org,role,details,status,created_at').in('kind', key.split(','))
      .eq('user_id', uid).order('created_at', { ascending: false })
      .then(({ data }) => setRows((data || []) as Enquiry[]));
  }, [uid, key, bump]);
  return rows;
}

export type BoardRow = { ref: string; title: string; sector: string; ctype: string; status: string; who: string; session_at: string | null; created_at: string };
export function useChallengeBoard() {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  useEffect(() => {
    if (!supabase) { setRows([]); return; }
    supabase.rpc('challenge_board').then(({ data }) => setRows((data || []) as BoardRow[]));
  }, []);
  return rows;
}

/* ---------- Member database and affiliates ---------- */
export type Member = {
  profile_id: string; name: string; city: string; headline: string; business: string; stage: string;
  skills: string[]; bio: string | null; joined_at: string; is_expert: boolean; is_me: boolean;
};
export function useDirectory(bump = 0) {
  const [rows, setRows] = useState<Member[] | null>(null);
  useEffect(() => {
    if (!supabase) { setRows([]); return; }
    supabase.rpc('member_directory').then(({ data }) => setRows((data || []) as Member[]));
  }, [bump]);
  return rows;
}

export type MyProfile = { name: string; email: string | null; phone: string | null; city: string | null; headline: string | null; business: string | null; stage: string | null; skills: string[]; bio: string | null; listed: boolean };
export async function loadMyProfile(uid: string): Promise<MyProfile | null> {
  const { data } = await db().from('profiles').select('name,email,phone,city,headline,business,stage,skills,bio,listed').eq('user_id', uid).maybeSingle();
  return (data as MyProfile) || null;
}
export async function saveMyProfile(uid: string, p: Partial<MyProfile>) {
  const { error } = await db().from('profiles').update(p).eq('user_id', uid);
  if (error) throw error;
}

export type Expert = { profile_id: string; name: string; city: string | null; business: string | null; skills: string[]; expertise: string; category: string; offer: string; rate: string | null };
export function useExperts() {
  const [rows, setRows] = useState<Expert[] | null>(null);
  useEffect(() => {
    if (!supabase) { setRows([]); return; }
    supabase.rpc('affiliate_experts').then(({ data }) => setRows((data || []) as Expert[]));
  }, []);
  return rows;
}

export type MyAffiliate = { expertise: string; category: string; offer: string; rate: string | null; status: 'pending' | 'approved' | 'declined'; code: string | null };
export function useMyAffiliate(bump = 0) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [row, setRow] = useState<MyAffiliate | null>(null);
  useEffect(() => {
    if (!supabase || !uid) { setRow(null); return; }
    supabase.from('affiliates').select('expertise,category,offer,rate,status,code').eq('user_id', uid).maybeSingle()
      .then(({ data }) => setRow((data as MyAffiliate) || null));
  }, [uid, bump]);
  return row;
}
export async function applyAffiliate(a: { expertise: string; category: string; offer: string; rate: string }) {
  const { error } = await db().from('affiliates').insert({ ...a, rate: a.rate || null });
  if (error) throw error;
}

/* ---------- eBooks ---------- */
export function useShelf(bump = 0) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!supabase || !uid) { setIds(new Set()); return; }
    supabase.from('ebook_shelf').select('ebook_id').then(({ data }) => setIds(new Set(((data || []) as { ebook_id: string }[]).map((x) => x.ebook_id))));
  }, [uid, bump]);
  return ids;
}
export async function getFreeEbook(id: string) {
  const { error } = await db().rpc('get_free_ebook', { p_ebook: id });
  if (error) throw error;
}
export async function ebookPdf(id: string): Promise<string | null> {
  const { data, error } = await db().rpc('ebook_pdf', { p_ebook: id });
  if (error) throw error;
  return (data as string) || null;
}

/* ---------- Small formatting helpers ---------- */
export function ago(t: string) {
  const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  if (s < 7 * 86400) return Math.floor(s / 86400) + ' d ago';
  return fmtDay(t);
}
export const fmtDay = (t: string) => new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtWhen = (t: string) =>
  new Date(t).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }) + ' WAT';
