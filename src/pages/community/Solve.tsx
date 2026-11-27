// The Crucible Circle and Business Solutions.
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Space } from '../../data/types';
import { site } from '../../data/site';
import prog from '../../data/programmes.json';
import { niceError, useAuth } from '../../lib/auth';
import { fmtDay, fmtWhen, sendEnquiry, useChallengeBoard, useMyEnquiries } from '../../lib/community';
import { Dialog, Howto, Rules, Sent, SpaceHead, Stats, Steps, Tabs, fields } from '../../components/Kit';

const CH_TYPES = prog.chTypes as [string, string, string, string][];
const ORG_TYPES = prog.orgTypes as string[];
const chType = (v: string) => CH_TYPES.find((x) => x[0] === v) || [v, v, '•', ''];

/* ---------- The Crucible Circle ---------- */
export function CruciblePage({ s }: { s: Space }) {
  const { sub = 'about' } = useParams();
  const tab = ['submit', 'board', 'join'].includes(sub) ? sub : 'about';
  return (
    <>
      <SpaceHead s={s}><Tabs s={s} label="Crucible Circle sections" tab={tab} list={[['about', '🔥 About'], ['submit', '📨 Submit a challenge'], ['board', '🗂️ Challenge board'], ['join', '🎓 Join as an expert']]} /></SpaceHead>
      {tab === 'submit' ? <CcSubmit /> : tab === 'board' ? <CcBoard /> : tab === 'join' ? <CcJoin s={s} /> : <CcAbout s={s} />}
    </>
  );
}

function CcAbout({ s }: { s: Space }) {
  return (
    <>
      <section className="card"><h2>What happens in the Circle</h2>
        <p>The Crucible Circle is the Advanced Management and Leadership Development community of Awelen Entrepreneurs. Serious private firms, public institutions, development organisations and governments across the continent bring their toughest strategic challenges here. Cohorts of carefully selected domain experts then work through them together, in live sessions in the Ideation Room, to produce grounded, practical and transformative recommendations.</p>
        <p>These are not panel discussions. They are not webinars dressed up as workshops. They are genuine, high-stakes thinking environments, built around one question that is difficult, consequential and not answerable by any one person in the room. The goal of each session is not consensus. It is clarity.</p>
        <div className="row" style={{ marginTop: 6 }}><Link className="btn lemon" to={`/space/${s.id}/submit`}>📨 Submit a challenge</Link><Link className="btn quiet" to={`/space/${s.id}/join`}>Join as an expert</Link></div>
      </section>
      <section className="card"><h2>Challenges we take on</h2><Howto list={CH_TYPES.map(([, n, i, d]) => [i, n + '.', d])} /></section>
      <section className="card"><h2>How a challenge moves through the Circle</h2>
        <Steps list={[['Submit your challenge, in confidence', 'Tell us what is happening, what you have tried and the decision you need to make.'],
          ['We frame the question with you', 'The Coordinator reviews your submission, clarifies it with you and frames the central question for the room.'],
          ['The Ideation Room', 'A Master Moderator leads a cohort of Expert Practitioners matched to your challenge through a live session.'],
          ['You receive the recommendations', 'A written synthesis of what was said, what was learned and the practical options in front of you.']]} />
      </section>
      <section className="card"><h2>Three roles, one purpose</h2>
        <Rules list={[['🧭', 'Coordinator', 'The organisational anchor. Holds everything outside the Ideation Room (communications, session logistics, assessment and relationships) so nothing distracts the room.'],
          ['🧠', 'Expert Practitioner', "The thinking the room is built to draw out. Arrives prepared, engages as a genuine peer, builds on others' contributions and honours confidentiality."],
          ['🎙️', 'Master Moderator', 'Holds the room. Designs the arc of each session, reads its dynamics, protects the quality of exchange and closes with purpose. Shapes the conditions, not the content.']]} />
      </section>
      <section className="card"><h2>Our standards</h2>
        <Rules list={[['🔒', 'Confidentiality is absolute', 'What is said inside the Ideation Room is not shared outside it. This is the condition that makes honest conversation possible.', true],
          ['🤝', 'Dignity is non-negotiable', 'Ideas are challenged vigorously. People are treated with consistent respect. The line between the two is always clear.'],
          ['📅', 'Commitment is kept', 'Attendance confirmed is attendance honoured. If something prevents it, the Coordinator hears as early as possible.'],
          ['⚖️', 'The process is trusted', "The assessment process, conduct standards and the Circle's decisions are followed in good faith."]]} />
      </section>
    </>
  );
}

function CcSubmit() {
  const { profile } = useAuth();
  const [sent, setSent] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const g = fields(e.currentTarget); const fd = new FormData(e.currentTarget);
    setBusy(true); setMsg('');
    try {
      await sendEnquiry({ kind: 'challenge', name: g('contact'), email: g('email'), phone: g('phone'), org: g('org'), role: g('role'),
        details: { orgType: g('orgType'), sector: g('sector'), type: g('type'), title: g('title'), desc: g('desc'), decision: g('decision'), timeline: g('timeline'), private: fd.get('private') === 'on' } });
      setSent(true);
    } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };
  if (sent) return <section className="card"><Sent title="Thank you. Your challenge is with the Coordinator" onAgain={() => setSent(false)} again="Submit another challenge"><p style={{ margin: 0 }}>Everything you shared is treated in confidence. The Coordinator will be in touch to clarify it with you and frame the question for the room.</p></Sent></section>;
  return (
    <form className="card stack" onSubmit={submit}>
      <div><h2 style={{ margin: 0 }}>Submit a challenge</h2><p className="small muted" style={{ margin: '4px 0 0' }}>For organisations of any kind. You don't need to be a member. Everything you share is treated in confidence and seen only by the Coordinator until you agree how it is presented to the room.</p></div>
      <fieldset className="fs"><legend>Your organisation</legend>
        <div className="fg">
          <label className="f"><span>Organisation name</span><input name="org" required maxLength={200} /></label>
          <label className="f"><span>Type of organisation</span><select name="orgType">{ORG_TYPES.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="f"><span>Sector</span><input name="sector" required maxLength={120} placeholder="e.g. Agriculture, Health, Banking" /></label>
        </div>
        <div className="fg">
          <label className="f"><span>Your name</span><input name="contact" required defaultValue={profile?.name || ''} /></label>
          <label className="f"><span>Your role</span><input name="role" placeholder="e.g. Managing Director" /></label>
          <label className="f"><span>Email</span><input type="email" name="email" required defaultValue={profile?.email || ''} /></label>
          <label className="f"><span>Phone or WhatsApp</span><input name="phone" defaultValue={profile?.phone || ''} /></label>
        </div>
      </fieldset>
      <fieldset className="fs"><legend>The challenge</legend>
        <label className="f"><span>Kind of challenge</span><select name="type">{CH_TYPES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
        <label className="f"><span>The challenge in one line</span><input name="title" required maxLength={120} placeholder="e.g. Reaching more customers without raising prices" /></label>
        <label className="f"><span>What is happening?</span><textarea name="desc" required maxLength={5000} placeholder="The situation, what you have already tried, and why it matters now" /></label>
        <label className="f"><span>What decision or result do you need?</span><textarea name="decision" required maxLength={3000} placeholder="What you want to be able to decide or do after the session" /></label>
        <label className="f"><span>When do you need it?</span><select name="timeline" defaultValue="1–3 months"><option>Within a month</option><option>1–3 months</option><option>Flexible</option></select></label>
      </fieldset>
      <label className="row small" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><input type="checkbox" name="private" defaultChecked style={{ width: 'auto', marginTop: 3 }} /> Keep our organisation's name off the public challenge board. Show only the sector and the challenge.</label>
      <label className="row small" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><input type="checkbox" required style={{ width: 'auto', marginTop: 3 }} /> I am authorised to share this challenge on behalf of my organisation.</label>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div><button className="btn lemon" disabled={busy}>{busy ? 'Sending…' : 'Submit challenge'}</button></div>
    </form>
  );
}

const statusBadge = (st: string) =>
  st === 'Recommendations delivered' ? <span className="badge">✓ Recommendations delivered</span>
  : st === 'Scheduled' || st === 'Session held' ? <span className="badge lemon">{st}</span> : <span className="badge grey">{st}</span>;

function CcBoard() {
  const all = useChallengeBoard();
  const [q, setQ] = useState(''); const [kind, setKind] = useState('');
  const rows = (all || []).filter((c) => (!q || (c.title + ' ' + c.sector).toLowerCase().includes(q.toLowerCase())) && (!kind || c.ctype === kind));
  const cnt = (st: string[]) => (all || []).filter((c) => st.includes(c.status)).length;
  return (
    <>
      <section className="card">
        <h2 style={{ margin: 0 }}>Challenge board</h2>
        <p className="small muted" style={{ margin: '4px 0 0' }}>Challenges organisations have brought to the Circle. Details stay confidential; you see the question and where it stands.</p>
        <Stats list={[[(all || []).length, 'Challenges'], [cnt(['Under review', 'Accepted']), 'Being reviewed'], [cnt(['Scheduled']), 'Scheduled'], [cnt(['Recommendations delivered']), 'Delivered']]} />
      </section>
      <div className="card mfilter">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search challenges or sectors" aria-label="Search challenges" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by kind of challenge"><option value="">All kinds</option>{CH_TYPES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
      </div>
      {all === null ? <div className="card empty">Loading the board…</div>
        : !rows.length ? <div className="card empty">{all.length ? 'No challenges match.' : 'No challenges on the board yet.'}</div>
        : (
          <div className="stack">
            {rows.map((c) => {
              const t = chType(c.ctype);
              return (
                <article className="card chc" key={c.ref}>
                  <div className="spread"><span className="badge lemon">{t[2]} {t[1]}</span>{statusBadge(c.status)}</div>
                  <h3>{c.title}</h3>
                  <div className="small muted">{c.who} · {c.sector} · ref {c.ref}</div>
                  {c.session_at && (c.status === 'Scheduled' || c.status === 'Session held') && <div className="small" style={{ marginTop: 6 }}>🗓️ Ideation Room: <b>{fmtWhen(c.session_at)}</b></div>}
                </article>
              );
            })}
          </div>
        )}
    </>
  );
}

const ROLES: [string, string, string, string][] = [
  ['Expert Practitioner', '🧠', 'The Ideation Room contributors', 'You are not early in your career. You have spent well over a decade inside the complexity of your industry, leading within it and solving problems that did not come with manuals. You have the academic formation to think rigorously and the practical scars to think honestly.'],
  ['Master Moderator', '🎙️', 'The architects of the room', 'A room full of exceptional experts, without the right person holding the space, can become a room full of competing monologues. You can draw out the quieter voice that carries the most important insight, and gently redirect the loudest voice without making it feel diminished.'],
];

function CcJoin({ s }: { s: Space }) {
  const [role, setRole] = useState('');
  const [bump, setBump] = useState(0);
  const mine = useMyEnquiries(['eoi'], bump);
  return (
    <>
      <section className="card"><h2>Join the Circle as an expert</h2>
        <p>We are assembling a carefully selected community of top-tier domain experts across industries to take part in live organisational ideation sessions. You will be in the room with peers who match your level, working on challenges that are real, complex and consequential. We look for people with the head and the heart to deliver decisions that respect people and lift them, not diminish them.</p>
        <p className="small muted" style={{ margin: 0 }}>Membership is by invitation after assessment. Every expression of interest receives a reply, whatever the outcome.</p>
      </section>
      <div className="grid">
        {ROLES.map(([r, i, sub, txt]) => (
          <article className="card xcard" key={r}>
            <span className="hi" aria-hidden="true" style={{ fontSize: '1.8rem' }}>{i}</span><span className="tnum">{sub}</span><h3>{r}</h3>
            <p className="small muted" style={{ margin: 0 }}>{txt}</p>
            <div className="spread"><span /><button className="btn sm" onClick={() => setRole(r)}>Send expression of interest</button></div>
          </article>
        ))}
      </div>
      {mine.length > 0 && (
        <section className="card" style={{ marginTop: 14 }}><h3>Your expressions of interest</h3>
          {mine.map((e) => <div className="dlrow" key={e.id}><span style={{ flex: 1 }}>{String(e.details.role || '')}<br /><span className="small muted">Sent {fmtDay(e.created_at)} · ref {e.ref}</span></span><span className="badge grey">{e.status}</span></div>)}
        </section>
      )}
      <Dialog open={!!role} onClose={() => setRole('')}>{role && <EoiForm role={role} space={s.name} onSent={() => setBump((b) => b + 1)} />}</Dialog>
    </>
  );
}

function EoiForm({ role, space, onSent }: { role: string; space: string; onSent: () => void }) {
  const { profile } = useAuth();
  const [sent, setSent] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const g = fields(e.currentTarget);
    setBusy(true); setMsg('');
    try {
      await sendEnquiry({ kind: 'eoi', name: g('name'), email: g('email'), phone: g('phone'), role: g('position'),
        details: { role, position: g('position'), industry: g('industry'), years: g('years'), qual: g('qual'), link: g('link'), why: g('why') } });
      setSent(true); onSent();
    } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };
  if (sent) return <Sent title="Thank you. Your expression of interest is in"><p style={{ margin: 0 }}>The Coordinator reviews every expression of interest and will reply, whatever the outcome.</p></Sent>;
  return (
    <form className="stack" onSubmit={submit}>
      <h2>Expression of interest</h2><p className="small muted" style={{ margin: 0 }}>{role} · {space}</p>
      <div className="fg">
        <label className="f"><span>Full name</span><input name="name" required defaultValue={profile?.name || ''} /></label>
        <label className="f"><span>Email</span><input type="email" name="email" required defaultValue={profile?.email || ''} /></label>
        <label className="f"><span>Phone or WhatsApp</span><input name="phone" defaultValue={profile?.phone || ''} /></label>
      </div>
      <div className="fg">
        <label className="f"><span>Current role and organisation</span><input name="position" required maxLength={160} /></label>
        <label className="f"><span>Industry</span><input name="industry" required maxLength={120} /></label>
      </div>
      <div className="fg">
        <label className="f"><span>Years of experience</span><select name="years"><option>10–15</option><option>15–20</option><option>20+</option></select></label>
        <label className="f"><span>Highest qualification</span><input name="qual" placeholder="e.g. MBA, PhD, ACA" /></label>
        <label className="f"><span>LinkedIn or profile link</span><input name="link" placeholder="https://" /></label>
      </div>
      <label className="f"><span>Why you, and what you would bring to the room</span><textarea name="why" required maxLength={3000} /></label>
      <label className="row small" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><input type="checkbox" required style={{ width: 'auto', marginTop: 3 }} /> I agree to keep everything shared in the Ideation Room confidential.</label>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send expression of interest'}</button></div>
    </form>
  );
}

/* ---------- Business Solutions ---------- */
export function ConsultPage({ s }: { s: Space }) {
  const [pick, setPick] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  const mine = useMyEnquiries(['consult'], bump);
  const svcTitle = (id: string) => site.services.find((v) => v.id === id)?.title || 'Something else';
  const book = (svc = '', label: ReactNode = 'Book a consultation', cls = 'btn sm') => <button className={cls} onClick={() => setPick(svc)}>{label}</button>;
  return (
    <>
      <SpaceHead s={s}>
        <div className="notice" style={{ marginTop: 12 }}><b>Every engagement starts with a free discovery call.</b> <span className="small">Tell us what is going on and we will arrange a no-obligation conversation to understand your situation before proposing anything. Sensitive matters such as turnarounds are handled in strict confidence.</span></div>
        <div className="row" style={{ marginTop: 12 }}>{book('', 'Book a consultation', 'btn lemon')}</div>
      </SpaceHead>
      <div className="grid svcs">
        {site.services.map((v) => (
          <article className="card xcard svc" key={v.id}>
            <span className="hi" aria-hidden="true" style={{ fontSize: '1.8rem' }}>{v.icon}</span>
            <h3>{v.title}</h3><p style={{ margin: 0, fontWeight: 600 }}>{v.tag}</p><p className="small muted" style={{ margin: 0 }}>{v.desc}</p>
            <div className="spread"><span>{v.id === 'coach' && <Link className="small" to="/space/coaching">See coaching sessions →</Link>}</span>{book(v.id)}</div>
          </article>
        ))}
      </div>
      <section className="card" style={{ marginTop: 14 }}><h2>How we work with you</h2>
        <Steps list={[['Free discovery call', 'No cost and no obligation. We listen first: your business, your situation and what a good result looks like for you.'],
          ['Diagnosis and proposal', 'We look at the facts, then send a clear proposal with scope, timeline and fees.'],
          ['The engagement', 'We work alongside you and your team, with regular check-ins and honest reporting.'],
          ['Review and handover', 'We review results together and make sure your team can carry the work forward.']]} />
      </section>
      {mine.length > 0 && (
        <section className="card"><h3>Your consultation requests</h3>
          {mine.map((c) => <div className="dlrow" key={c.id}><span style={{ flex: 1 }}>{svcTitle(String(c.details.svc || ''))}<br /><span className="small muted">Ref {c.ref} · sent {fmtDay(c.created_at)}</span></span><span className="badge grey">{c.status}</span></div>)}
        </section>
      )}
      <Dialog open={pick !== null} onClose={() => setPick(null)}>{pick !== null && <ConsultForm svc={pick} onSent={() => setBump((b) => b + 1)} />}</Dialog>
    </>
  );
}

function ConsultForm({ svc, onSent }: { svc: string; onSent: () => void }) {
  const { profile } = useAuth();
  const [sent, setSent] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const g = fields(e.currentTarget);
    setBusy(true); setMsg('');
    try {
      await sendEnquiry({ kind: 'consult', name: g('name'), email: g('email'), phone: g('phone'), org: g('org'), role: g('role'),
        details: { svc: g('svc'), contact: g('contact'), stage: g('stage'), what: g('what'), result: g('result'), urgency: g('urgency') } });
      setSent(true); onSent();
    } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };
  if (sent) return <Sent title="Thank you, your request is in"><p style={{ margin: 0 }}>We will reply within two working days to arrange your free discovery call.</p></Sent>;
  return (
    <form className="stack" onSubmit={submit}>
      <h2>Book a consultation</h2>
      <p className="small muted" style={{ margin: 0 }}>Tell us a little about your situation. We will reply to arrange your free discovery call.</p>
      <label className="f"><span>What do you need help with?</span><select name="svc" defaultValue={svc}>{site.services.map((v) => <option key={v.id} value={v.id}>{v.icon} {v.title}</option>)}<option value="other">Something else</option></select></label>
      <div className="fg">
        <label className="f"><span>Your name</span><input name="name" required defaultValue={profile?.name || ''} /></label>
        <label className="f"><span>Business or organisation</span><input name="org" required maxLength={200} /></label>
        <label className="f"><span>Your role</span><input name="role" /></label>
      </div>
      <div className="fg">
        <label className="f"><span>Email</span><input type="email" name="email" required defaultValue={profile?.email || ''} /></label>
        <label className="f"><span>Phone or WhatsApp</span><input name="phone" defaultValue={profile?.phone || ''} /></label>
        <label className="f"><span>Best way to reach you</span><select name="contact"><option>Call</option><option>WhatsApp</option><option>Email</option><option>Video call</option></select></label>
      </div>
      <label className="f"><span>Where is the business now?</span><select name="stage">{['Idea', 'Starting', 'Running', 'Growing', 'Established', 'Under pressure'].map((x) => <option key={x}>{x}</option>)}</select></label>
      <label className="f"><span>What is going on?</span><textarea name="what" required maxLength={3000} placeholder="The situation in a few sentences" /></label>
      <label className="f"><span>What would a good result look like?</span><textarea name="result" maxLength={2000} /></label>
      <label className="f"><span>How soon do you need help?</span><select name="urgency" defaultValue="This month"><option>This week</option><option>This month</option><option>This quarter</option><option>Just exploring</option></select></label>
      <p className="small muted" style={{ margin: 0 }}>🔒 What you share here is seen only by the Awelen team.</p>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div><button className="btn lemon" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button></div>
    </form>
  );
}
