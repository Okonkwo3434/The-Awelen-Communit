// Phase 5: the admin portal. Admins see everything; team editors see Events, Lesson media and News.
// Every action is also checked by Supabase's security rules, so the portal can't do more than the person may.
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { site } from '../../data/site';
import { niceError, useAuth } from '../../lib/auth';
import { useModals } from '../../components/Modals';
import { Dialog, Stats } from '../../components/Kit';
import { Details, Loading, courseName, day, dayTime, db, fromLocalInput, money, namesFor, q, toLocalInput, useLoad } from './common';
import { MoneyTab, PromosTab } from './AdminMoney';
import { EventsTab, MediaTab, NewsTab, TeamTab } from './AdminContent';

const TABS: [string, string, string, boolean][] = [   // id, icon, label, editors too?
  ['overview', '📊', 'Overview', false], ['inbox', '📥', 'Inbox', false], ['money', '🧾', 'Money', false], ['people', '👥', 'People', false],
  ['events', '📅', 'Events', true], ['media', '🎥', 'Lesson media & eBooks', true], ['promos', '🏷️', 'Promo offers', false], ['news', '📣', 'Announcements', true], ['team', '🔐', 'Team', false],
];

export function AdminPage() {
  const { ready, session, teamRole, teamChecked } = useAuth();
  const { openAccount } = useModals();
  const { tab: t = '' } = useParams();
  if (!ready) return <div className="card empty">Loading…</div>;
  if (!session) return (
    <section className="card"><h2 style={{ marginTop: 0 }}>Team sign-in</h2>
      <p>The admin portal is only for Awele and the team. Sign in with your team email to continue.</p>
      <button className="btn" onClick={() => openAccount('in')}>Sign in</button></section>
  );
  if (!teamRole) {
    if (!teamChecked) return <div className="card empty">Checking your team access…</div>;
    return <div className="card empty">The admin portal is only for the course creator and team editors. <Link to="/">Go to Welcome</Link></div>;
  }
  const list = TABS.filter((x) => teamRole === 'admin' || x[3]);
  const tab = list.some((x) => x[0] === t) ? t : list[0][0];
  return (
    <>
      <nav className="tabs card" aria-label="Admin sections" style={{ margin: 0, padding: '6px 12px 0' }}>
        {list.map(([k, i, l]) => <Link key={k} to={'/admin' + (k === list[0][0] ? '' : '/' + k)} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined}>{i} {l}</Link>)}
      </nav>
      {tab === 'overview' ? <Overview /> : tab === 'inbox' ? <Inbox /> : tab === 'money' ? <MoneyTab /> : tab === 'people' ? <People />
        : tab === 'events' ? <EventsTab /> : tab === 'media' ? <MediaTab /> : tab === 'promos' ? <PromosTab /> : tab === 'news' ? <NewsTab /> : <TeamTab />}
    </>
  );
}

/* ---------- Overview ---------- */
type Counts = { enquiries: Record<string, number>; payment_requests: number; bookings: number; affiliates: number; messages: number; members: number; members_30d: number; enrollments: number; visitors: number; paid: Record<string, number> };
export const KIND_LABEL: Record<string, [string, string, string]> = {   // icon, one, many
  challenge: ['🔥', 'new Crucible Circle challenge', 'new Crucible Circle challenges'], eoi: ['🎓', 'expert expression of interest', 'expert expressions of interest'],
  consult: ['🛠️', 'new consultation request', 'new consultation requests'], coaching: ['🤝', 'coaching discovery-call request', 'coaching discovery-call requests'],
  cohort: ['✨', 'Executive Presence Cohort application', 'Executive Presence Cohort applications'], faculty: ['🧑‍🏫', 'faculty application', 'faculty applications'],
  corporate: ['🏢', 'organisation enquiry', 'organisation enquiries'], brief: ['📋', 'client brief offer', 'client brief offers'], intro: ['💼', 'introduction request', 'introduction requests'],
  creator: ['🚀', 'Teach on Awelen creator sign-up', 'Teach on Awelen creator sign-ups'],
};

function Overview() {
  const { data: c, error } = useLoad(() => q<Counts>(db().rpc('admin_counts')), []);
  if (!c) return <Loading error={error} what="the overview" />;
  const all: [number, string, string, string][] = [
    [c.payment_requests, '🧾', c.payment_requests === 1 ? 'bank transfer or LinPay payment to confirm' : 'bank transfer or LinPay payments to confirm', '/admin/money'],
    [c.bookings, '📅', c.bookings === 1 ? 'paid session waiting for payment' : 'paid sessions waiting for payment', '/admin/money'],
    ...Object.entries(c.enquiries).map(([k, n]) => [n, KIND_LABEL[k]?.[0] || '📥', n === 1 ? KIND_LABEL[k]?.[1] || k : KIND_LABEL[k]?.[2] || k, '/admin/inbox?kind=' + k] as [number, string, string, string]),
    [c.affiliates, '💼', c.affiliates === 1 ? 'affiliate application' : 'affiliate applications', '/admin/people?view=affiliates'],
    [c.messages, '✉️', c.messages === 1 ? 'new contact message' : 'new contact messages', '/admin/people?view=messages'],
  ];
  const todo = all.filter((x) => x[0] > 0);
  const paid = Object.entries(c.paid).map(([cur, n]) => money(n, cur)).join(' + ') || money(0, 'USD');
  return (
    <>
      <section className="card"><h2>Needs your attention</h2>
        {todo.length ? todo.map(([n, i, l, to]) => <Link key={l} className="todo" to={to}><span className="hi" aria-hidden="true">{i}</span><span><b>{n}</b> {l}</span><span className="muted" style={{ marginLeft: 'auto' }}>Open →</span></Link>)
          : <p className="muted" style={{ margin: 0 }}>All clear. Nothing is waiting for you.</p>}
      </section>
      <section className="card"><h2>At a glance</h2>
        <Stats list={[[c.members, 'Members'], [c.members_30d, 'Joined in 30 days'], [c.enrollments, 'Course enrolments'], [c.visitors, 'Visitor sign-ups']]} />
        <Stats list={[[site.courses.length, 'Courses'], [site.courses.reduce((t, x) => t + x.modules.reduce((u, m) => u + m.lessons.length, 0), 0), 'Lessons'], [paid, 'Payments received'], [site.tracks.length, 'Tracks']]} />
        <p className="small muted" style={{ margin: '10px 0 0' }}>Payment totals count only payments recorded on this platform, not your full bank or Paystack balance.</p>
      </section>
    </>
  );
}

/* ---------- Inbox: every form from the special spaces ---------- */
type Enq = { id: string; kind: string; ref: string; user_id: string | null; name: string; email: string; phone: string | null; org: string | null; role: string | null; details: Record<string, unknown>; status: string; scheduled_at: string | null; notes: string | null; created_at: string };
const STATUSES: Record<string, string[]> = {
  challenge: ['Received', 'Under review', 'Accepted', 'Scheduled', 'Session held', 'Recommendations delivered', 'Declined'],
  eoi: ['Received', 'In assessment', 'Admitted', 'Not admitted'],
  consult: ['Received', 'Discovery call booked', 'Proposal sent', 'Engaged', 'Completed', 'Closed'],
  coaching: ['Received', 'Discovery call booked', 'Engaged', 'Completed', 'Closed'],
  intro: ['Received', 'Introduced', 'Closed'],
  creator: ['Received', 'Call booked', 'Setting up', 'Live', 'Closed'],
};
const statusesFor = (k: string) => STATUSES[k] || ['Received', 'In review', 'Accepted', 'Declined'];
const KIND_NAME: Record<string, string> = { challenge: 'Crucible challenge', eoi: 'Expert interest', consult: 'Consultation', coaching: 'Coaching call', cohort: 'EP Cohort application', faculty: 'Faculty application', corporate: 'Organisation enquiry', brief: 'Client brief', intro: 'Introduction', creator: 'Creator sign-up' };

function Inbox() {
  const params = new URLSearchParams(location.search);
  const [kind, setKind] = useState(params.get('kind') || '');
  const [status, setStatus] = useState('open');
  const [open, setOpen] = useState<Enq | null>(null);
  const { data, error, reload } = useLoad(async () => {
    let qq = db().from('enquiries').select('*').order('created_at', { ascending: false }).limit(300);
    if (kind) qq = qq.eq('kind', kind);
    return q<Enq[]>(qq);
  }, [kind]);
  const closed = ['Declined', 'Not admitted', 'Completed', 'Closed', 'Recommendations delivered', 'Introduced'];
  const rows = (data || []).filter((e) => status === 'all' || (status === 'new' ? e.status === 'Received' : !closed.includes(e.status)));
  return (
    <>
      <section className="card"><h2 style={{ margin: 0 }}>Inbox</h2>
        <p className="small muted" style={{ margin: '4px 0 0' }}>Everything sent from the special spaces: Crucible Circle challenges and expert interest, consultations, coaching calls, programme applications and introductions. Members see the status you set here.</p>
      </section>
      <div className="card mfilter">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind"><option value="">Every kind</option>{Object.entries(KIND_NAME).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="open">Still open</option><option value="new">New only</option><option value="all">Everything</option></select>
      </div>
      {!data ? <Loading error={error} what="the inbox" /> : !rows.length ? <div className="card empty">Nothing here.</div> : (
        <div className="card" style={{ padding: 0 }}><div className="tablewrap"><table className="mtable" style={{ minWidth: 760 }}>
          <thead><tr><th>From</th><th>Kind</th><th>About</th><th>Received</th><th>Status</th><th><span className="sr">Open</span></th></tr></thead>
          <tbody>{rows.map((e) => (
            <tr key={e.id}>
              <td><b>{e.name}</b><br /><span className="small muted">{e.org || e.email}</span></td>
              <td>{KIND_LABEL[e.kind]?.[0]} {KIND_NAME[e.kind] || e.kind}<br /><span className="small muted">ref {e.ref}</span></td>
              <td className="small">{String(e.details.title || e.details.to_name || e.details.area || e.details.svc || e.details.role || e.role || '')}</td>
              <td className="small">{day(e.created_at)}</td>
              <td><span className={'badge' + (e.status === 'Received' ? ' lemon' : ' grey')}>{e.status}</span></td>
              <td><button className="btn ghost sm" onClick={() => setOpen(e)}>Open</button></td>
            </tr>))}</tbody></table></div></div>
      )}
      <Dialog open={!!open} onClose={() => setOpen(null)} wide>{open && <EnquiryForm e={open} onSaved={() => { setOpen(null); reload(); }} />}</Dialog>
    </>
  );
}

function EnquiryForm({ e, onSaved }: { e: Enq; onSaved: () => void }) {
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const save = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault(); const fd = new FormData(ev.currentTarget);
    setBusy(true); setMsg('');
    try {
      const patch: Record<string, unknown> = { status: String(fd.get('status')), notes: String(fd.get('notes') || '').trim() || null };
      if (e.kind === 'challenge') patch.scheduled_at = fromLocalInput(String(fd.get('when') || ''));
      await q(db().from('enquiries').update(patch).eq('id', e.id));
      onSaved();
    } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };
  return (
    <form className="stack" onSubmit={save}>
      <div><h2 style={{ margin: 0 }}>{e.name}</h2><p className="small muted" style={{ margin: '2px 0 0' }}>{KIND_NAME[e.kind]} · ref {e.ref} · received {dayTime(e.created_at)}{e.user_id ? ' · member' : ' · visitor'}</p></div>
      <div className="fg">
        <div><div className="small muted">Email</div><a href={'mailto:' + e.email + '?subject=' + encodeURIComponent('Your Awelen request ' + e.ref)}>{e.email}</a></div>
        {e.phone && <div><div className="small muted">Phone</div><a href={'tel:' + e.phone.replace(/\s/g, '')}>{e.phone}</a></div>}
        {e.org && <div><div className="small muted">Organisation</div>{e.org}</div>}
        {e.role && <div><div className="small muted">Role</div>{e.role}</div>}
      </div>
      <div className="notice" style={{ background: 'var(--page)' }}><Details d={e.details} /></div>
      <div className="fg">
        <label className="f"><span>Status</span><select name="status" defaultValue={e.status}>{statusesFor(e.kind).map((s) => <option key={s}>{s}</option>)}</select></label>
        {e.kind === 'challenge' && <label className="f"><span>Ideation Room session (Lagos time)</span><input type="datetime-local" name="when" defaultValue={toLocalInput(e.scheduled_at)} /></label>}
      </div>
      {e.kind === 'challenge' && <p className="small muted" style={{ margin: 0 }}>A challenge appears on the public Challenge board once you move it past Received (and not Declined).</p>}
      <label className="f"><span>Team notes (never shown to the sender)</span><textarea name="notes" defaultValue={e.notes || ''} maxLength={4000} /></label>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
    </form>
  );
}

/* ---------- People: members, affiliates, visitors and contact messages ---------- */
type Prof = { user_id: string; name: string; email: string | null; phone: string | null; city: string | null; business: string | null; stage: string | null; status: string; joined_at: string; listed: boolean };
type Enr = { user_id: string; course_id: string; plan: string; amount_due: number; amount_paid: number; created_at: string };

function People() {
  const params = new URLSearchParams(location.search);
  const [view, setView] = useState(params.get('view') || 'members');
  return (
    <>
      <nav className="tabs card" aria-label="People" style={{ margin: 0, padding: '6px 12px 0' }}>
        {[['members', '🗂️ Members'], ['affiliates', '💼 Affiliates'], ['visitors', '👋 Visitor sign-ups'], ['messages', '✉️ Contact messages']].map(([k, l]) =>
          <a key={k} href={'#' + k} className={view === k ? 'on' : ''} onClick={(e) => { e.preventDefault(); setView(k); }}>{l}</a>)}
      </nav>
      {view === 'affiliates' ? <Affiliates /> : view === 'visitors' ? <Visitors /> : view === 'messages' ? <Messages /> : <Members />}
    </>
  );
}

function Members() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Prof | null>(null);
  const { data, error, reload } = useLoad(async () => {
    const [p, e] = await Promise.all([
      q<Prof[]>(db().from('profiles').select('user_id,name,email,phone,city,business,stage,status,joined_at,listed').not('user_id', 'is', null).order('joined_at', { ascending: false }).limit(1000)),
      q<Enr[]>(db().from('enrollments').select('user_id,course_id,plan,amount_due,amount_paid,created_at')),
    ]);
    return { p, e };
  }, []);
  if (!data) return <Loading error={error} what="members" />;
  const s = search.toLowerCase();
  const rows = data.p.filter((m) => !s || [m.name, m.email, m.city, m.business].join(' ').toLowerCase().includes(s));
  const enr = (u: string) => data.e.filter((x) => x.user_id === u);
  const csv = () => {
    const head = ['Name', 'Email', 'Phone', 'City', 'Business', 'Stage', 'Status', 'Joined', 'Courses'];
    const lines = data.p.map((m) => [m.name, m.email, m.phone, m.city, m.business, m.stage, m.status, day(m.joined_at), enr(m.user_id).map((x) => courseName(x.course_id)).join('; ')]
      .map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }));
    a.download = 'awelen-members.csv'; a.click();
  };
  return (
    <>
      <div className="card mfilter">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, city or business" aria-label="Search members" />
        <button className="btn quiet sm" onClick={csv}>⬇ Export CSV</button>
      </div>
      <div className="card" style={{ padding: 0 }}><div className="tablewrap"><table className="mtable">
        <thead><tr><th>Member</th><th>Contact</th><th>City</th><th className="num">Courses</th><th>Joined</th><th>Status</th><th><span className="sr">Open</span></th></tr></thead>
        <tbody>{rows.map((m) => (
          <tr key={m.user_id}>
            <td><b>{m.name}</b><br /><span className="small muted">{m.business || ''}</span></td>
            <td className="small">{m.email}<br />{m.phone}</td><td>{m.city || ''}</td><td className="num">{enr(m.user_id).length}</td>
            <td className="small" style={{ whiteSpace: 'nowrap' }}>{day(m.joined_at)}</td>
            <td><span className={'badge' + (m.status === 'Active' ? '' : ' grey')}>{m.status}</span></td>
            <td><button className="btn ghost sm" onClick={() => setOpen(m)}>Open</button></td>
          </tr>))}
          {!rows.length && <tr><td colSpan={7} className="muted">No members found.</td></tr>}</tbody></table></div></div>
      <Dialog open={!!open} onClose={() => setOpen(null)} wide>{open && <MemberAdmin m={open} enrolments={enr(open.user_id)} onChange={reload} />}</Dialog>
    </>
  );
}

function MemberAdmin({ m, enrolments, onChange }: { m: Prof; enrolments: Enr[]; onChange: () => void }) {
  const [msg, setMsg] = useState(''); const [pick, setPick] = useState('');
  const [status, setStatus] = useState(m.status);
  const run = async (f: () => Promise<unknown>, ok: string) => { setMsg(''); try { await f(); setMsg(ok); onChange(); } catch (err) { setMsg(niceError(err)); } };
  const has = new Set(enrolments.map((e) => e.course_id));
  return (
    <div className="stack">
      <div><h2 style={{ margin: 0 }}>{m.name}</h2><p className="small muted" style={{ margin: '2px 0 0' }}>{m.email} · {m.phone || 'no phone'} · joined {day(m.joined_at)}{m.listed ? '' : ' · hidden from the Member database'}</p></div>
      <div className="row">
        <span className="small">Account status:</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 'auto' }}><option>Active</option><option>Suspended</option></select>
        <button className="btn quiet sm" onClick={() => run(() => q(db().from('profiles').update({ status }).eq('user_id', m.user_id)), 'Status saved.')}>Save status</button>
      </div>
      <h3 style={{ margin: '6px 0 0' }}>Courses</h3>
      {enrolments.length ? enrolments.map((e) => (
        <div className="dlrow" key={e.course_id}>
          <span style={{ flex: 1, minWidth: 0 }}><b>{courseName(e.course_id)}</b><br /><span className="small muted">{e.plan === 'granted' ? 'Place given by the team' : e.plan === 'free' ? 'Free course' : `${e.plan === 'installments' ? 'Installments' : 'Paid in full'} · ${money(e.amount_paid, site.courses.find((c) => c.id === e.course_id)?.currency)} of ${money(e.amount_due, site.courses.find((c) => c.id === e.course_id)?.currency)}`} · since {day(e.created_at)}</span></span>
          {e.plan === 'granted' && <button className="btn ghost sm" onClick={() => { if (confirm('Remove this place?')) run(() => q(db().from('enrollments').delete().eq('user_id', m.user_id).eq('course_id', e.course_id)), 'Place removed.'); }}>Remove</button>}
        </div>)) : <p className="small muted" style={{ margin: 0 }}>No courses yet.</p>}
      <div className="row">
        <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ width: 'auto', maxWidth: 380 }} aria-label="Course to give">
          <option value="">Give a place on a course…</option>
          {site.courses.filter((c) => !has.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}{c.mode === 'application' ? ' (by application)' : ''}</option>)}
        </select>
        <button className="btn sm" disabled={!pick} onClick={() => run(() => q(db().from('enrollments').insert({ user_id: m.user_id, course_id: pick, plan: 'granted' })), 'Place given. The course is now open for them.')}>Give place</button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Use this for accepted AMLD and Executive Presence Cohort applicants, scholarships and complimentary places.</p>
      {msg && <p className="small" role="status">{msg}</p>}
    </div>
  );
}

function Affiliates() {
  type Aff = { user_id: string; expertise: string; category: string; offer: string; rate: string | null; status: string; code: string | null; created_at: string };
  const { data, error, reload } = useLoad(async () => {
    const a = await q<Aff[]>(db().from('affiliates').select('*').order('created_at', { ascending: false }));
    return { a, n: await namesFor(a.map((x) => x.user_id)) };
  }, []);
  const [msg, setMsg] = useState('');
  if (!data) return <Loading error={error} what="affiliates" />;
  const set = async (u: string, status: string) => { setMsg(''); try { await q(db().from('affiliates').update({ status }).eq('user_id', u)); reload(); } catch (err) { setMsg(niceError(err)); } };
  return (
    <div className="card">
      <h2>Affiliate applications and experts</h2>
      <p className="small muted" style={{ margin: '0 0 10px' }}>Approving someone lists them under Find an expert and gives them a referral code. Commission is {site.affiliate.rate}%.</p>
      {data.a.length ? data.a.map((a) => (
        <div className="dlrow" key={a.user_id}>
          <span style={{ flex: 1, minWidth: 0 }}><b>{data.n[a.user_id]?.name || 'Member'}</b>: {a.expertise}<br /><span className="small muted">{a.category} · {a.offer}{a.rate ? ' · ' + a.rate : ''} · {data.n[a.user_id]?.email}</span></span>
          {a.code && <code className="small">{a.code}</code>}
          <span className={'badge' + (a.status === 'approved' ? ' lemon' : ' grey')}>{a.status}</span>
          {a.status !== 'approved' && <button className="btn sm" onClick={() => set(a.user_id, 'approved')}>Approve</button>}
          {a.status !== 'declined' && <button className="btn ghost sm" onClick={() => set(a.user_id, 'declined')}>{a.status === 'approved' ? 'Remove' : 'Decline'}</button>}
        </div>)) : <p className="muted small">No applications yet.</p>}
      {msg && <p className="formmsg" role="alert">{msg}</p>}
    </div>
  );
}

function Visitors() {
  type V = { id: string; name: string; email: string; phone: string | null; interest: string | null; first_page: string | null; visits: number; first_seen: string; last_seen: string };
  const { data, error } = useLoad(() => q<V[]>(db().from('visitors').select('*').order('last_seen', { ascending: false }).limit(1000)), []);
  if (!data) return <Loading error={error} what="visitors" />;
  return (
    <div className="card" style={{ padding: 0 }}><h2 style={{ padding: '18px 18px 0' }}>Visitor sign-ups</h2>
      <p className="small muted" style={{ padding: '0 18px' }}>People who left their details on the “before you go” form. Members who later join appear under Members.</p>
      <div className="tablewrap"><table className="mtable" style={{ minWidth: 720 }}>
        <thead><tr><th>Visitor</th><th>Interest</th><th>First page</th><th className="num">Visits</th><th>First seen</th><th>Last seen</th></tr></thead>
        <tbody>{data.map((v) => <tr key={v.id}><td><b>{v.name}</b><br /><span className="small muted">{v.email}{v.phone ? ' · ' + v.phone : ''}</span></td><td>{v.interest || ''}</td><td className="small">{v.first_page || ''}</td><td className="num">{v.visits}</td><td className="small">{day(v.first_seen)}</td><td className="small">{day(v.last_seen)}</td></tr>)}
          {!data.length && <tr><td colSpan={6} className="muted">No sign-ups yet.</td></tr>}</tbody></table></div></div>
  );
}

function Messages() {
  type M = { id: string; name: string; email: string; phone: string | null; topic: string | null; message: string; status: string; created_at: string };
  const { data, error, reload } = useLoad(() => q<M[]>(db().from('contact_messages').select('*').order('created_at', { ascending: false }).limit(500)), []);
  if (!data) return <Loading error={error} what="messages" />;
  const mark = async (id: string, status: string) => { await db().from('contact_messages').update({ status }).eq('id', id); reload(); };
  return (
    <div className="card"><h2>Contact messages</h2>
      {data.length ? data.map((m) => (
        <article key={m.id} className="dlrow" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{m.name}</b> <span className="small muted">· {m.topic || 'General'} · {dayTime(m.created_at)}</span><br />
            <a className="small" href={'mailto:' + m.email + '?subject=' + encodeURIComponent('Re: your message to Awelen')}>{m.email}</a>{m.phone && <span className="small"> · {m.phone}</span>}
            <p style={{ margin: '6px 0 0', whiteSpace: 'pre-line' }}>{m.message}</p>
          </div>
          {m.status === 'New' ? <button className="btn quiet sm" onClick={() => mark(m.id, 'Handled')}>Mark handled</button> : <span className="badge grey">{m.status}</span>}
        </article>)) : <p className="muted small">No messages yet.</p>}
    </div>
  );
}
