// Supabase Edge Function: paystack-verify
// Called by the website right after a Paystack payment. It asks Paystack directly whether the
// payment really succeeded and for how much, then unlocks the course through apply_payment().
// The browser is never trusted with the amount.
//
// Needs one secret (Supabase > Edge Functions > Secrets): PAYSTACK_SECRET_KEY = sk_test_... or sk_live_...
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Use POST' }, 405);

  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) return reply({ error: 'Payments are not set up yet (PAYSTACK_SECRET_KEY missing).' }, 500);

  // 1. Who is asking? (the signed-in member)
  const auth = req.headers.get('Authorization') || '';
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: who } = await asUser.auth.getUser();
  if (!who?.user) return reply({ error: 'Please sign in again and retry.' }, 401);

  let body: { reference?: string; course_id?: string };
  try { body = await req.json(); } catch { return reply({ error: 'Bad request' }, 400); }
  const reference = String(body.reference || '').trim();
  const courseId = String(body.course_id || '').trim();
  if (!/^[A-Za-z0-9._=-]{6,100}$/.test(reference) || !courseId) return reply({ error: 'Missing payment reference or course.' }, 400);

  // 2. Ask Paystack about this payment
  const ps = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
    headers: { Authorization: 'Bearer ' + secret },
  });
  const pj = await ps.json().catch(() => null);
  const tx = pj?.data;
  if (!ps.ok || !pj?.status || !tx) return reply({ error: 'Paystack could not confirm this payment yet. If you were charged, contact us with reference ' + reference }, 402);
  if (tx.status !== 'success') return reply({ error: 'This payment was not successful (' + tx.status + ').' }, 402);

  // 3. Make sure the payment was made for this member and this course
  const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
  if (meta.user_id !== who.user.id || meta.course_id !== courseId) {
    return reply({ error: 'This payment belongs to a different account or course.' }, 403);
  }

  // 4. The payment must be in the course's own currency (US dollars or naira)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: course } = await admin.from('courses').select('currency').eq('id', courseId).maybeSingle();
  const want = course?.currency || 'NGN';
  if (tx.currency !== want) return reply({ error: 'This course is paid in ' + (want === 'USD' ? 'US dollars' : 'naira') + '. Reference: ' + reference }, 402);

  // 5. Record it and unlock the course (whole dollars or naira; Paystack reports cents or kobo)
  const amount = Math.round(Number(tx.amount)) / 100;
  const { data, error } = await admin.rpc('apply_payment', {
    p_user: who.user.id, p_course: courseId, p_amount: amount, p_gateway: 'Paystack', p_reference: reference,
    p_raw: { id: tx.id, paid_at: tx.paid_at, channel: tx.channel, email: tx.customer?.email, currency: tx.currency, amount_minor: tx.amount },
  });
  if (error) {
    // Already recorded (e.g. the page was refreshed): treat as success
    if (/duplicate key|unique/i.test(error.message)) {
      const { data: e } = await admin.from('enrollments').select('*').eq('user_id', who.user.id).eq('course_id', courseId).maybeSingle();
      return reply({ ok: true, enrollment: e, already: true });
    }
    return reply({ error: error.message }, 400);
  }
  return reply({ ok: true, enrollment: data });
});
