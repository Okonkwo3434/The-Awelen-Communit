// Admin portal: Money (payments to confirm, payments received, paid sessions, eBook sales) and Promo offers.
import { useState, type FormEvent } from 'react';
import { site } from '../../data/site';
import { niceError } from '../../lib/auth';
import { Dialog } from '../../components/Kit';
import { Loading, courseName, day, dayTime, db, fromLocalInput, money, namesFor, q, toLocalInput, useLoad } from './common';

type Req = { id: string; user_id: string; course_id: string; method: string; amount: number; currency: string; reference: string | null; note: string | null; promo_code: string | null; status: string; created_at: string; decided_at: string | null };
type Pay = { id: string; user_id: string; course_id: string; reference: string; gateway: string; amount: number; currency: string; promo: string | null; paid_at: string };
type Book = { event_id: string; user_id: string; status: string; created_at: string };
type Ev = { id: string; title: string; starts_at: string; price: number; currency: string };
type Shelf = { user_id: string; ebook_id: string; how: string; amount: number | null; reference: string | null; created_at: string };

export function MoneyTab() {
  const [msg, setMsg] = useState('');
  const { data, error, reload } = useLoad(async () => {
    const [reqs, pays, books, shelf, promos] = await Promise.all([
      q<Req[]>(db().from('payment_requests').select('*').order('created_at', { ascending: false }).limit(300)),
      q<Pay[]>(db().from('payments').select('*').order('paid_at', { ascending: false }).limit(300)),
      q<Book[]>(db().from('event_bookings').select('*').in('status', ['awaiting payment', 'paid']).order('created_at', { ascending: false })),
      q<Shelf[]>(db().from('ebook_shelf').select('*').eq('how', 'paid').order('created_at', { ascending: false })),
      q<{ id: string; name: string; code: string | null }[]>(db().from('promos').select('id,name,code')),
    ]);
    const evs = books.length ? await q<Ev[]>(db().from('events').select('id,title,starts_at,price,currency').in('id', [...new Set(books.map((b) => b.event_id))])) : [];
    const names = await namesFor([...reqs, ...pays, ...books, ...shelf].map((x) => x.user_id));
    return { reqs, pays, books, shelf, evs, names, promos };
  }, []);
  if (!data) return <Loading error={error} what="payments" />;
  const nm = (u: string) => data.names[u]?.name || 'Member';
  const em = (u: string) => data.names[u]?.email || '';
  const pending = data.reqs.filter((r) => r.status === 'pending');
  const decide = async (id: string, status: 'confirmed' | 'rejected') => {
    if (status === 'confirmed' && !confirm('Confirm you have received this money? The course unlocks for the member straight away.')) return;
    setMsg('');
    try { await q(db().from('payment_requests').update({ status }).eq('id', id)); setMsg(status === 'confirmed' ? 'Payment confirmed and course unlocked.' : 'Request marked as not received.'); reload(); }
    catch (err) { setMsg(niceError(err)); }
  };
  const setBooking = async (b: Book, status: string) => {
    setMsg('');
    try { await q(db().from('event_bookings').update({ status }).eq('event_id', b.event_id).eq('user_id', b.user_id)); reload(); } catch (err) { setMsg(niceError(err)); }
  };
  const totals: Record<string, number> = {};
  data.pays.forEach((p) => { totals[p.currency] = (totals[p.currency] || 0) + Number(p.amount); });
  const promoName = (id: string | null) => { const p = data.promos.find((x) => x.id === id); return p ? p.code || p.name : ''; };
  const ev = (id: string) => data.evs.find((e) => e.id === id);
  const book = (id: string) => site.ebooks.find((b) => b.id === id)?.title || id;
  return (
    <>
      {msg && <div className="notice" role="status">{msg}</div>}
      <section className="card"><h2>Bank transfer and LinPay payments to confirm</h2>
        <p className="small muted" style={{ margin: '0 0 10px' }}>Check your bank or LinPay account, then confirm. Confirming unlocks the course; the amount must cover the price (or the first installment) or the database refuses it.</p>
        {pending.length ? pending.map((r) => {
          const cur = site.courses.find((c) => c.id === r.course_id)?.currency;
          return (
            <div className="dlrow" key={r.id}>
              <span style={{ flex: 1, minWidth: 0 }}><b>{nm(r.user_id)}</b> · {money(r.amount, cur)} for {courseName(r.course_id)}<br />
                <span className="small muted">{r.method} · {r.reference || 'no reference'}{r.promo_code ? ' · code ' + r.promo_code : ''}{r.note ? ' · “' + r.note + '”' : ''} · {dayTime(r.created_at)} · {em(r.user_id)}</span></span>
              <button className="btn sm" onClick={() => decide(r.id, 'confirmed')}>Confirm</button>
              <button className="btn ghost sm" onClick={() => decide(r.id, 'rejected')}>Not received</button>
            </div>
          );
        }) : <p className="muted small" style={{ margin: 0 }}>Nothing waiting.</p>}
      </section>
      <section className="card"><h2>Paid sessions</h2>
        <p className="small muted" style={{ margin: '0 0 10px' }}>Coaching sessions with a fee hold the member's place until you mark them paid. Email them how to pay.</p>
        {data.books.length ? data.books.map((b) => { const e = ev(b.event_id); return (
          <div className="dlrow" key={b.event_id + b.user_id}>
            <span style={{ flex: 1, minWidth: 0 }}><b>{nm(b.user_id)}</b> · {e?.title || b.event_id}<br /><span className="small muted">{e ? dayTime(e.starts_at) + ' · ' + money(e.price, e.currency) : ''} · {em(b.user_id)}</span></span>
            {b.status === 'awaiting payment' ? <><button className="btn sm" onClick={() => setBooking(b, 'paid')}>Mark paid</button><button className="btn ghost sm" onClick={() => setBooking(b, 'cancelled')}>Release place</button></> : <span className="badge">Paid</span>}
          </div>); }) : <p className="muted small" style={{ margin: 0 }}>No paid sessions booked.</p>}
      </section>
      <section className="card" style={{ padding: 0 }}>
        <div style={{ padding: '18px 18px 0' }}><h2 style={{ margin: 0 }}>Course payments received</h2>
          <p className="small muted" style={{ margin: '4px 0 0' }}>Totals: {Object.entries(totals).map(([c, n]) => money(n, c)).join(' + ') || 'none yet'}. Match Paystack payments with your <a href="https://dashboard.paystack.com/#/transactions" target="_blank" rel="noopener">Paystack dashboard</a>.</p></div>
        <div className="tablewrap" style={{ marginTop: 10 }}><table className="mtable" style={{ minWidth: 760 }}>
          <thead><tr><th>Member</th><th>Course</th><th>How</th><th className="num">Amount</th><th>Offer</th><th>Date</th></tr></thead>
          <tbody>{data.pays.map((p) => <tr key={p.id}><td><b>{nm(p.user_id)}</b><br /><span className="small muted">{em(p.user_id)}</span></td><td>{courseName(p.course_id)}</td><td className="small">{p.gateway}<br /><span className="muted">{p.reference}</span></td><td className="num">{money(p.amount, p.currency)}</td><td className="small">{promoName(p.promo)}</td><td className="small">{day(p.paid_at)}</td></tr>)}
            {!data.pays.length && <tr><td colSpan={6} className="muted">No payments yet.</td></tr>}</tbody></table></div>
      </section>
      <section className="card"><h2>eBook sales</h2>
        {data.shelf.length ? data.shelf.map((s) => <div className="dlrow" key={s.user_id + s.ebook_id}><span style={{ flex: 1 }}><b>{nm(s.user_id)}</b> · {book(s.ebook_id)}<br /><span className="small muted">{s.reference} · {day(s.created_at)}</span></span><b>{money(Number(s.amount || 0), 'NGN')}</b></div>)
          : <p className="muted small" style={{ margin: 0 }}>No eBook sales yet.</p>}
      </section>
      <section className="card"><h2>Recent payment notices</h2>
        {data.reqs.filter((r) => r.status !== 'pending').slice(0, 30).map((r) => <div className="dlrow" key={r.id}><span style={{ flex: 1 }}>{nm(r.user_id)} · {courseName(r.course_id)} · {money(r.amount, site.courses.find((c) => c.id === r.course_id)?.currency)}<br /><span className="small muted">{r.method} · {day(r.decided_at)}</span></span><span className={'badge' + (r.status === 'confirmed' ? '' : ' grey')}>{r.status}</span></div>)}
        {!data.reqs.some((r) => r.status !== 'pending') && <p className="muted small" style={{ margin: 0 }}>None yet.</p>}
      </section>
    </>
  );
}

/* ---------- Promo offers ---------- */
type Promo = { id: string; name: string; code: string | null; auto: boolean; kind: 'percent' | 'amount'; value: number; scope: 'all' | 'full'; courses: string[]; starts_at: string | null; ends_at: string | null; max_uses: number | null; uses: number; active: boolean };
const stateOf = (p: Promo) => {
  const now = Date.now();
  if (!p.active) return 'Paused';
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return 'Scheduled';
  if (p.ends_at && new Date(p.ends_at).getTime() <= now) return 'Ended';
  if (p.max_uses != null && p.uses >= p.max_uses) return 'Used up';
  return 'Live';
};

export function PromosTab() {
  const { data, error, reload } = useLoad(() => q<Promo[]>(db().from('promos').select('*').order('created_at', { ascending: false })), []);
  const [edit, setEdit] = useState<Promo | 'code' | 'auto' | null>(null);
  if (!data) return <Loading error={error} what="promo offers" />;
  const what = (p: Promo) => (p.kind === 'percent' ? `${Number(p.value)}% off` : `${Number(p.value)} off`) + (p.scope === 'full' ? ', pay once only' : '');
  return (
    <>
      <section className="card">
        <div className="spread"><h2 style={{ margin: 0 }}>Promo offers</h2><div className="row"><button className="btn sm" onClick={() => setEdit('code')}>＋ Promo code</button><button className="btn quiet sm" onClick={() => setEdit('auto')}>＋ Automatic offer</button></div></div>
        <p className="small muted" style={{ margin: '6px 0 0' }}>A <b>promo code</b> gives a discount to anyone who types it at checkout. An <b>automatic offer</b>, such as a launch price, applies to everyone while it is live and shows the old price crossed out. When several apply, each learner gets the single best one. The server checks every discount, so a price can't be faked.</p>
      </section>
      <div className="card" style={{ padding: 0 }}><div className="tablewrap"><table className="mtable" style={{ minWidth: 760 }}>
        <thead><tr><th>Offer</th><th>Gives</th><th>Courses</th><th>Dates</th><th className="num">Used</th><th>State</th><th><span className="sr">Edit</span></th></tr></thead>
        <tbody>{data.map((p) => (
          <tr key={p.id}>
            <td><b>{p.code || p.name}</b><br /><span className="small muted">{p.auto ? 'Automatic' : 'Code'}{p.code && p.name ? ' · ' + p.name : ''}</span></td>
            <td className="small">{what(p)}</td>
            <td className="small">{p.courses.length ? p.courses.map(courseName).join(', ') : 'All paid courses'}</td>
            <td className="small">{p.starts_at ? day(p.starts_at) : 'Now'} – {p.ends_at ? day(p.ends_at) : 'no end'}</td>
            <td className="num">{p.uses}{p.max_uses ? ' / ' + p.max_uses : ''}</td>
            <td><span className={'badge' + (stateOf(p) === 'Live' ? ' lemon' : ' grey')}>{stateOf(p) === 'Live' ? '● ' : ''}{stateOf(p)}</span></td>
            <td><button className="btn ghost sm" onClick={() => setEdit(p)}>✎</button></td>
          </tr>))}
          {!data.length && <tr><td colSpan={7} className="muted">No offers yet.</td></tr>}</tbody></table></div></div>
      <Dialog open={!!edit} onClose={() => setEdit(null)} wide>{edit && <PromoForm p={typeof edit === 'string' ? null : edit} auto={edit === 'auto' || (typeof edit !== 'string' && edit.auto)} onDone={() => { setEdit(null); reload(); }} />}</Dialog>
    </>
  );
}

function PromoForm({ p, auto, onDone }: { p: Promo | null; auto: boolean; onDone: () => void }) {
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const paid = site.courses.filter((c) => c.mode === 'paid');
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const g = (k: string) => String(fd.get(k) || '').trim();
    const row = {
      name: g('name'), auto, code: auto ? null : g('code').toUpperCase(), kind: g('kind'), value: Number(g('value')), scope: g('scope'),
      courses: fd.getAll('courses').map(String), starts_at: fromLocalInput(g('starts')), ends_at: fromLocalInput(g('ends')),
      max_uses: g('max') ? Number(g('max')) : null, active: fd.get('active') === 'on',
    };
    if (!auto && !/^[A-Z0-9_-]{3,30}$/.test(row.code || '')) return setMsg('Codes are 3 to 30 letters, numbers, - or _, with no spaces.');
    if (!(row.value > 0) || (row.kind === 'percent' && row.value > 100)) return setMsg('Enter a discount above 0 (and at most 100%).');
    setBusy(true); setMsg('');
    try { await q(p ? db().from('promos').update(row).eq('id', p.id) : db().from('promos').insert(row)); onDone(); }
    catch (err) { setMsg(/duplicate key/i.test(niceError(err)) ? 'That code is already in use.' : niceError(err)); } finally { setBusy(false); }
  };
  const del = async () => { if (!p || !confirm('Delete this offer? Payments already made keep their discount.')) return; try { await q(db().from('promos').delete().eq('id', p.id)); onDone(); } catch (err) { setMsg(niceError(err)); } };
  return (
    <form className="stack" onSubmit={save}>
      <h2>{p ? 'Edit offer' : auto ? 'New automatic offer' : 'New promo code'}</h2>
      <div className="fg">
        {!auto && <label className="f"><span>Code learners type</span><input name="code" required defaultValue={p?.code || ''} placeholder="e.g. FOUNDER20" style={{ textTransform: 'uppercase' }} /></label>}
        <label className="f"><span>Name (shown to learners)</span><input name="name" defaultValue={p?.name || ''} placeholder={auto ? 'e.g. Launch offer' : 'e.g. Founders discount'} required={auto} /></label>
      </div>
      <div className="fg">
        <label className="f"><span>Discount type</span><select name="kind" defaultValue={p?.kind || 'percent'}><option value="percent">Percentage off</option><option value="amount">Money off (in the course currency)</option></select></label>
        <label className="f"><span>Discount</span><input type="number" name="value" min="0.01" step="any" required defaultValue={p ? Number(p.value) : 10} /></label>
        <label className="f"><span>Applies to</span><select name="scope" defaultValue={p?.scope || 'all'}><option value="all">Pay once and installments</option><option value="full">Pay once only</option></select></label>
      </div>
      <fieldset className="fs"><legend>Courses (leave all unticked for every paid course)</legend>
        <div className="stack" style={{ gap: 4, maxHeight: 220, overflow: 'auto' }}>
          {paid.map((c) => <label key={c.id} className="row small" style={{ flexWrap: 'nowrap' }}><input type="checkbox" name="courses" value={c.id} defaultChecked={p?.courses.includes(c.id)} style={{ width: 'auto' }} /> {c.title}</label>)}
        </div>
      </fieldset>
      <div className="fg">
        <label className="f"><span>Starts (Lagos time, optional)</span><input type="datetime-local" name="starts" defaultValue={toLocalInput(p?.starts_at)} /></label>
        <label className="f"><span>Ends (optional)</span><input type="datetime-local" name="ends" defaultValue={toLocalInput(p?.ends_at)} /></label>
        <label className="f"><span>Maximum uses (optional)</span><input type="number" name="max" min="1" defaultValue={p?.max_uses ?? ''} /></label>
      </div>
      <label className="row small" style={{ flexWrap: 'nowrap' }}><input type="checkbox" name="active" defaultChecked={p ? p.active : true} style={{ width: 'auto' }} /> Active (untick to pause)</label>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div className="row"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save offer'}</button>{p && <button type="button" className="btn danger" onClick={del}>Delete</button>}</div>
    </form>
  );
}
