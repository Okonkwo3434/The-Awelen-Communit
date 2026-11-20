import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

export type Enrollment = { course_id: string; plan: 'free' | 'full' | 'installments' | 'granted'; amount_due: number; amount_paid: number; created_at: string };
export type LessonMedia = { lesson_id: string; video_url: string | null; pdf_url: string | null; notes: string | null };

const db = () => {
  if (!supabase) throw new Error('The database is not connected yet.');
  return supabase;
};

/** The signed-in member's enrolment and completed lessons for one course. */
export function useCourseState(courseId: string) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!supabase || !uid) { setEnrollment(null); setDone(new Set()); setLoading(false); return; }
    setLoading(true);
    const [e, p] = await Promise.all([
      supabase.from('enrollments').select('course_id,plan,amount_due,amount_paid,created_at').eq('course_id', courseId).maybeSingle(),
      supabase.from('lesson_progress').select('lesson_id').eq('course_id', courseId),
    ]);
    setEnrollment((e.data as Enrollment) || null);
    setDone(new Set((p.data || []).map((r: { lesson_id: string }) => r.lesson_id)));
    setLoading(false);
  }, [uid, courseId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { loading, enrollment, done, refresh, signedIn: !!uid };
}

/** All of the member's enrolments with how many lessons they have finished in each. */
export function useMyLearning() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [rows, setRows] = useState<{ e: Enrollment; done: number }[]>([]);
  useEffect(() => {
    if (!supabase || !uid) { setRows([]); return; }
    Promise.all([
      supabase.from('enrollments').select('course_id,plan,amount_due,amount_paid,created_at').order('created_at', { ascending: false }),
      supabase.from('lesson_progress').select('course_id'),
    ]).then(([e, p]) => {
      const count: Record<string, number> = {};
      (p.data || []).forEach((r: { course_id: string }) => { count[r.course_id] = (count[r.course_id] || 0) + 1; });
      setRows(((e.data || []) as Enrollment[]).map((x) => ({ e: x, done: count[x.course_id] || 0 })));
    });
  }, [uid]);
  return rows;
}

export function useLessonMedia(lessonId: string, enabled: boolean) {
  const [media, setMedia] = useState<LessonMedia | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!supabase || !enabled) { setMedia(null); return; }
    setLoading(true);
    supabase.from('lesson_media').select('lesson_id,video_url,pdf_url,notes').eq('lesson_id', lessonId).maybeSingle()
      .then(({ data }) => { setMedia((data as LessonMedia) || null); setLoading(false); });
  }, [lessonId, enabled]);
  return { media, loading };
}

export async function startFreeCourse(courseId: string) {
  const { error } = await db().rpc('enroll_free', { p_course: courseId });
  if (error) throw error;
}

export async function completeLesson(courseId: string, lessonId: string, answer?: string) {
  const { error } = await db().from('lesson_progress').insert({ course_id: courseId, lesson_id: lessonId, answer: answer || null });
  if (error && !/duplicate key/i.test(error.message)) throw error;
}

export async function sendPaymentRequest(r: { course_id: string; method: 'Bank transfer' | 'LinPay'; amount: number; reference: string; note: string }) {
  const { error } = await db().from('payment_requests').insert({ ...r, reference: r.reference || null, note: r.note || null });
  if (error) throw error;
}

export async function myPendingRequests(courseId: string) {
  if (!supabase) return [];
  const { data } = await supabase.from('payment_requests').select('id,amount,method,status,created_at').eq('course_id', courseId).eq('status', 'pending');
  return data || [];
}

/* ---------- Paystack ---------- */
export const paystackKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined) || '';

type PaystackPopType = new () => {
  newTransaction: (o: {
    key: string; email: string; amount: number; currency: string; reference: string;
    metadata: Record<string, unknown>;
    onSuccess: (t: { reference: string }) => void; onCancel: () => void; onError?: (e: { message: string }) => void;
  }) => void;
};

function loadPaystack(): Promise<PaystackPopType> {
  const w = window as unknown as { PaystackPop?: PaystackPopType };
  if (w.PaystackPop) return Promise.resolve(w.PaystackPop);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v2/inline.js';
    s.onload = () => (w.PaystackPop ? res(w.PaystackPop) : rej(new Error('Paystack did not load.')));
    s.onerror = () => rej(new Error('Could not load Paystack. Check the internet connection.'));
    document.head.appendChild(s);
  });
}

/** Opens Paystack, then asks our server to confirm the payment with Paystack and unlock the course. */
export async function payWithPaystack(o: { courseId: string; courseTitle: string; amount: number; email: string; userId: string }): Promise<'paid' | 'cancelled'> {
  if (!paystackKey) throw new Error('Card payments are not switched on yet.');
  const Pop = await loadPaystack();
  const reference = 'AWL-' + o.courseId.toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const ref = await new Promise<string | null>((resolve, reject) => {
    new Pop().newTransaction({
      key: paystackKey, email: o.email, amount: Math.round(o.amount * 100), currency: 'NGN', reference,
      metadata: {
        user_id: o.userId, course_id: o.courseId,
        custom_fields: [{ display_name: 'Course', variable_name: 'course', value: o.courseTitle }],
      },
      onSuccess: (t) => resolve(t.reference || reference),
      onCancel: () => resolve(null),
      onError: (e) => reject(new Error(e?.message || 'Paystack reported an error.')),
    });
  });
  if (!ref) return 'cancelled';
  const { data, error } = await db().functions.invoke('paystack-verify', { body: { reference: ref, course_id: o.courseId } });
  if (error) {
    let msg = error.message;
    try { const j = await (error as { context?: Response }).context?.json(); if (j?.error) msg = j.error; } catch { /* keep message */ }
    throw new Error(msg + ` (Payment reference ${ref}. Keep it in case you need to contact us.)`);
  }
  if (!data?.ok) throw new Error('We could not confirm the payment. Reference: ' + ref);
  return 'paid';
}

/* ---------- Video and PDF links ---------- */
export function embedUrl(raw: string): { kind: 'iframe' | 'file' | 'link' | ''; src?: string } {
  const u = String(raw || '').trim();
  if (!/^https?:\/\//i.test(u)) return { kind: '' };
  let m: RegExpMatchArray | null;
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/))) return { kind: 'iframe', src: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0&modestbranding=1' };
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return { kind: 'iframe', src: 'https://player.vimeo.com/video/' + m[1] };
  if (/iframe\.mediadelivery\.net\/(embed|play)\//.test(u)) return { kind: 'iframe', src: u.replace('/play/', '/embed/') };
  if ((m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/))) return { kind: 'iframe', src: 'https://drive.google.com/file/d/' + m[1] + '/preview' };
  if (/\.(mp4|webm|ogv|ogg|mov|m4v)(\?|#|$)/i.test(u) || /\/storage\/v1\/object\/(public|sign)\//.test(u)) return { kind: 'file', src: u };
  return { kind: 'link', src: u };
}

export function pdfSrc(u: string) {
  const m = String(u).match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  return m ? 'https://drive.google.com/file/d/' + m[1] + '/preview' : u + (u.includes('#') ? '' : '#view=FitH');
}
