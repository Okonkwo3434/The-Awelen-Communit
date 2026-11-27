// Event spaces: Hangout, Live events, and Private coaching & mentoring (with its two programmes and discovery calls).
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Space } from '../../data/types';
import { naira, dollars, site } from '../../data/site';
import prog from '../../data/programmes.json';
import { niceError, useAuth } from '../../lib/auth';
import { bookEvent, cancelBooking, fmtWhen, sendEnquiry, useEvents, type EventRow } from '../../lib/community';
import { useModals } from '../../components/Modals';
import { Avatar, Dialog, Faq, Howto, Rules, Sent, SpaceHead, Steps, Tabs, fields } from '../../components/Kit';

const STYLE: Record<string, { yes: string; no: string }> = {
  coaching: { yes: '✓ Booked', no: 'Book' }, hangout: { yes: '✓ Going', no: 'RSVP' }, webinar: { yes: '✓ Registered', no: 'Register' },
};
const money = (e: EventRow) => (e.currency === 'USD' ? dollars(e.price) : naira(e.price));

export function EventList({ s }: { s: Space }) {
  const { session } = useAuth();
  const { openAccount } = useModals();
  const { events, mine, loading, refresh } = useEvents(s.id);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const st = STYLE[s.style || 'hangout'] || STYLE.hangout;
  const say = (id: string, m: string) => setMsg((x) => ({ ...x, [id]: m }));

  if (loading) return <div className="card empty">Loading events…</div>;
  if (!events.length) return <div className="card empty">No events scheduled yet.</div>;
  return (
    <>
      {events.map((e) => {
        const dt = new Date(e.starts_at), left = e.seats - e.taken, past = dt.getTime() < Date.now(), my = mine[e.id];
        const act = async () => {
          if (!session) return openAccount('up');
          say(e.id, '');
          try {
            if (my) { await cancelBooking(e.id); say(e.id, 'Your place has been released.'); }
            else {
              const r = await bookEvent(e.id);
              say(e.id, r === 'awaiting payment'
                ? `Your place is held. We'll email you how to pay ${money(e)} to confirm it, usually within one working day.`
                : 'You’re in. The joining link will be emailed to you before the session.');
            }
            refresh();
          } catch (err) { say(e.id, niceError(err)); }
        };
        return (
          <article className="card ev" key={e.id}>
            <div className="date"><b>{dt.getDate()}</b><span>{dt.toLocaleString('en', { month: 'short' })}</span></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0 }}>{e.title}</h3>
              <div className="small muted">{fmtWhen(e.starts_at)} · {e.mins} min · with {e.host}</div>
              <p style={{ margin: '8px 0' }}>{e.description}</p>
              <div className="spread">
                <span className="small muted">{left > 0 ? `${left} of ${e.seats} places left` : 'Fully booked'}{e.price > 0 ? ' · ' + money(e) : ' · Free'}</span>
                <div className="row">
                  {past ? <span className="badge grey">Ended</span>
                    : my ? <button className="btn quiet sm" onClick={act} title="Release my place">{my === 'awaiting payment' ? '⏳ Held · awaiting payment' : st.yes}</button>
                    : left <= 0 ? <button className="btn sm" disabled>Full</button>
                    : <button className={'btn sm' + (e.price > 0 ? ' lemon' : '')} onClick={act}>{st.no}{e.price > 0 ? ' · ' + money(e) : ''}</button>}
                </div>
              </div>
              {my === 'booked' && !msg[e.id] && <p className="small muted" style={{ margin: '6px 0 0' }}>The joining link will be emailed to you before the session. Click the button again to release your place.</p>}
              {msg[e.id] && <p className="small" role="status" style={{ margin: '6px 0 0' }}>{msg[e.id]}</p>}
            </div>
          </article>
        );
      })}
    </>
  );
}

export function EventSpacePage({ s }: { s: Space }) {
  if (s.style === 'coaching') return <CoachingPage s={s} />;
  return <><SpaceHead s={s} /><EventList s={s} /></>;
}

/* ---------- Private coaching & mentoring ---------- */
type Area = { id: string; icon: string; title: string; tag: string; quote: string; intro: string; stuck: [string, string][]; offer: [string, string][]; change: [string, string, string][]; pkgs: [string, string][] };
type Prog = { id: string; name: string; icon: string; tag: string; intro: string; forWho: string; areas: Area[] };
const PROGS = prog.coachProgs as unknown as Prog[];
const TIERS = prog.coachTiers as [string, string, string][];

function CoachingPage({ s }: { s: Space }) {
  const { sub = 'about', sub2 } = useParams();
  const [ask, setAsk] = useState<string | null>(null);   // area id ('' = not sure) when the form is open
  const p = PROGS.find((x) => x.id === sub);
  const cta = (area = '', label = '📞 Book a free discovery call') => <button className="btn lemon" onClick={() => setAsk(area)}>{label}</button>;
  return (
    <>
      <SpaceHead s={s}>
        <Tabs s={s} label="Coaching sections" tab={p ? p.id : sub} list={[['about', '🤝 Overview'], ['finance', '💰 Financial coaching'], ['leadership', '🧭 Leadership coaching'], ['sessions', '📅 Book a session']]} />
      </SpaceHead>
      {sub === 'sessions' ? (
        <>
          <div className="card guide spread"><span><b>Not sure which session is right for you?</b><br /><span className="small">Start with a free 30-minute discovery call and we will point you to the right one.</span></span>{cta('', '📞 Free discovery call')}</div>
          <EventList s={s} />
        </>
      ) : p ? <CoachProg s={s} p={p} open={sub2} cta={cta} /> : <CoachAbout s={s} cta={cta} />}
      <Dialog open={ask !== null} onClose={() => setAsk(null)}><CoachForm area={ask || ''} /></Dialog>
    </>
  );
}

function CoachAbout({ s, cta }: { s: Space; cta: (a?: string, l?: string) => ReactNode }) {
  const c = site.creator;
  return (
    <>
      <section className="card"><h2>Coaching and mentoring for your money and your leadership</h2>
        <p>Some questions don’t fit in a course. How do I get my finances under control? Where should I invest? Am I ready to lead a team, and how do I do it well? These are personal, and they deserve personal attention.</p>
        <p>Private coaching gives you one-to-one time with Awele, in complete confidence, to work on the area that matters most to you right now. You get a clear plan, practical tools, honest feedback and someone who holds you to what you set out to do. Every engagement starts with a free 30-minute discovery call, with no pressure and no obligation.</p>
        <div className="row" style={{ marginTop: 6 }}>{cta()}<Link className="btn quiet" to={`/space/${s.id}/sessions`}>📅 See upcoming sessions</Link></div>
      </section>
      <section className="card"><h2>Two coaching programmes</h2>
        <div className="rules">
          {PROGS.map((p) => (
            <div className="rule" style={{ flexDirection: 'column', gap: 8 }} key={p.id}>
              <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><span className="ri" aria-hidden="true">{p.icon}</span><div style={{ minWidth: 0 }}><b>{p.name}</b><p>{p.tag}</p></div></div>
              <div className="row" style={{ gap: 6 }}>{p.areas.map((a) => <Link key={a.id} className="chip" style={{ textDecoration: 'none' }} to={`/space/${s.id}/${p.id}/${a.id}`}>{a.icon} {a.title}</Link>)}</div>
              <div><Link className="btn quiet sm" to={`/space/${s.id}/${p.id}`}>Explore {p.name.toLowerCase()} →</Link></div>
            </div>
          ))}
        </div>
      </section>
      <section className="card"><h2>Coaching and mentoring, together</h2>
        <Rules list={[['🎯', 'Coaching', 'Helps you find your own answers. Structured sessions, clear goals, a written plan and accountability between sessions, so progress is real and visible.'],
          ['🧓🏾', 'Mentoring', 'Gives you the benefit of experience. Awele shares what he has seen work, and fail, across accounting, banking, executive leadership and building businesses, so you avoid costly detours.']]} />
      </section>
      <section className="card"><h2>Who this is for</h2>
        <Howto list={[['🚀', 'Founders and business owners', 'growing from doing everything themselves to leading people, and putting their own finances in order alongside the business.'],
          ['🙋', 'For yourself.', 'Professionals who earn well but want a plan for their money, or high performers preparing to step into leadership.'],
          ['👥', 'For your team.', 'Managers who want to develop their people, not just manage them, and build a team that takes ownership.'],
          ['🏛️', 'For leaders.', 'Senior leaders building the systems, culture and presence that let an organisation grow without depending on them for everything.']]} />
      </section>
      <section className="card"><h2>How it works</h2>
        <Steps list={[['Free discovery call (30 minutes)', 'A relaxed conversation about where you are and what you want to change. No forms, no pressure. Just listening.'],
          ['Honest assessment', 'We look clearly at your starting point: your finances, your leadership style or both. Not a judgement, just the foundation for a good plan.'],
          ['Your personal plan', 'A written roadmap with clear goals and milestones. For leadership, this is usually a focused 60-day plan built around your real work.'],
          ['Coaching sessions', 'Fortnightly or monthly sessions where we work on real situations, practise hard conversations and make decisions together.'],
          ['Review and sustain', 'We review your progress, document what has changed and set up the habits that keep it going. You can reach out with follow-up questions for 30 days.']]} />
      </section>
      <section className="card"><h2>Choose your depth</h2>
        <p className="small muted" style={{ margin: '0 0 12px' }}>Every coaching area comes in three levels. You don’t need to decide now: we agree the right level, and the fee, together after your discovery call.</p>
        <div className="tiers">{TIERS.map(([n, i, d], k) => <div key={n} className={'card tier' + (k === 1 ? ' pop' : '')}><h3 style={{ margin: 0 }}>{i} {n}</h3><p className="small" style={{ margin: 0 }}>{d}</p></div>)}</div>
        <p className="small" style={{ margin: '12px 0 0' }}>Prefer to start small? <Link to={`/space/${s.id}/sessions`}>Book a single session</Link>.</p>
      </section>
      <section className="card"><h2>About your coach</h2>
        <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><Avatar name={c.name} size={64} creator />
          <div style={{ minWidth: 0 }}><b>{c.name}</b><div className="small muted">{c.title}</div>
            <p style={{ margin: '10px 0 0' }}>Awele is a Chartered Accountant with banking (ACIB) and insurance (ACII) qualifications, an MSc in Economics and an MBA in Finance. He began his career at PricewaterhouseCoopers, then served at International Merchant Bank as CFO, CTO, CMO and Chief Forex Dealer, before going on to lead as a CEO and management consultant.</p>
            <p style={{ margin: '8px 0 0' }}>Today he builds businesses of his own, across agriculture, technology and consulting, and coordinates The Crucible Circle, a leadership and ideation community. That mix of finance, banking, insurance, technology and executive leadership is exactly what both coaching programmes draw on.</p>
          </div>
        </div>
      </section>
      <section className="card"><h2>Our promise</h2>
        <Rules list={[['🔒', 'Confidential, always', 'What you share in coaching stays between you and your coach.', true], ['⚖️', 'Honest', 'Straight talk about your numbers and your leadership, delivered with respect.'],
          ['🛠️', 'Practical', 'No jargon and no theory for its own sake. Tools you can use the same week.'], ['🙅', 'No pressure', 'Nothing is ever pushed on you. Your decision, your timeline.']]} />
      </section>
      <section className="card"><h2>Questions people ask</h2>
        <Faq list={prog.coachFaq as [string, string][]} />
        <div className="row" style={{ marginTop: 14 }}>{cta()}<Link className="btn quiet" to="/space/contact">Ask a question</Link></div>
      </section>
    </>
  );
}

function CoachProg({ s, p, open, cta }: { s: Space; p: Prog; open?: string; cta: (a?: string, l?: string) => ReactNode }) {
  const pick = p.areas.some((a) => a.id === open) ? open : p.areas[0].id;
  return (
    <>
      <section className="card"><h2>{p.icon} {p.name}</h2><p>{p.intro}</p><p className="small muted" style={{ margin: 0 }}><b>Who it’s for:</b> {p.forWho}</p>
        <div className="row" style={{ gap: 6, marginTop: 12 }}>{p.areas.map((a) => <Link key={a.id} className="chip" style={{ textDecoration: 'none', background: a.id === pick ? 'var(--lemon)' : undefined }} to={`/space/${s.id}/${p.id}/${a.id}`}>{a.icon} {a.title}</Link>)}</div>
      </section>
      {p.areas.map((a) => (
        <details className="mod card" style={{ padding: 0 }} key={a.id + (a.id === pick ? '-open' : '')} open={a.id === pick}>
          <summary style={{ padding: '14px 18px' }}><span style={{ fontSize: '1.1rem' }}>{a.icon}</span> {a.title}<div className="small muted" style={{ fontWeight: 400, marginTop: 2 }}>{a.tag}</div></summary>
          <div className="stack" style={{ padding: '0 18px 18px' }}>
            <div className="notice"><span className="small muted">Sound familiar?</span><br /><i>“{a.quote}”</i></div>
            <p style={{ margin: 0 }}>{a.intro}</p>
            <h3 style={{ margin: '6px 0 0' }}>Where people get stuck</h3>
            <div className="rules">{a.stuck.map(([t, d]) => <div className="rule" key={t}><span className="ri" aria-hidden="true">•</span><div style={{ minWidth: 0 }}><b>{t}</b><p>{d}</p></div></div>)}</div>
            <h3 style={{ margin: '6px 0 0' }}>What we work on together</h3>
            <div className="rules">{a.offer.map(([t, d], i) => <div className="rule" key={t}><span className="ri" aria-hidden="true">{'abcdef'[i]}</span><div style={{ minWidth: 0 }}><b>{t}</b><p>{d}</p></div></div>)}</div>
            <h3 style={{ margin: '6px 0 0' }}>What changes</h3>
            <div className="tablewrap"><table className="mtable" style={{ minWidth: 520 }}><thead><tr><th>Area</th><th>Before coaching</th><th>After coaching</th></tr></thead>
              <tbody>{a.change.map(([k, b, f]) => <tr key={k}><td><b>{k}</b></td><td>{b}</td><td>{f}</td></tr>)}</tbody></table></div>
            <h3 style={{ margin: '6px 0 0' }}>Ways to work together</h3>
            <div className="tiers">{a.pkgs.map(([n, d], k) => <div key={n} className={'card tier' + (k === 1 ? ' pop' : '')}><span className="small muted">{TIERS[k][1]} {TIERS[k][0]}</span><h3 style={{ margin: 0 }}>{n}</h3><p className="small" style={{ margin: 0 }}>{d}</p></div>)}</div>
            <p className="small muted" style={{ margin: 0 }}>Fees are agreed after your free discovery call, once we know what you need.</p>
            <div>{cta(a.id, '📞 Book a free discovery call about ' + a.title.toLowerCase())}</div>
          </div>
        </details>
      ))}
    </>
  );
}

function CoachForm({ area }: { area: string }) {
  const { profile } = useAuth();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const g = fields(e.currentTarget);
    const a = PROGS.flatMap((p) => p.areas).find((x) => x.id === g('area'));
    setBusy(true); setMsg('');
    try {
      await sendEnquiry({ kind: 'coaching', name: g('name'), email: g('email'), phone: g('phone'), org: g('org'), role: g('role'),
        details: { area: a ? a.title : 'Not sure yet', level: g('level'), contact: g('contact'), stage: g('stage'), what: g('what'), result: g('result'), urgency: g('urgency') } });
      setSent(true);
    } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };
  if (sent) return <Sent title="Thank you, your request is with Awele"><p style={{ margin: 0 }}>We’ll be in touch within two working days to arrange your free discovery call.</p></Sent>;
  return (
    <form className="stack" onSubmit={submit}>
      <h2>Book a free discovery call</h2>
      <p className="small muted" style={{ margin: 0 }}>A relaxed 30-minute conversation about where you are and what you want to change. No cost and no obligation.</p>
      <div className="fg">
        <label className="f"><span>Which area interests you most?</span>
          <select name="area" defaultValue={area}>
            {PROGS.map((p) => <optgroup key={p.id} label={p.name}>{p.areas.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.title}</option>)}</optgroup>)}
            <option value="">Not sure yet</option>
          </select></label>
        <label className="f"><span>Level you have in mind</span><select name="level"><option>Not sure yet</option>{TIERS.map(([n]) => <option key={n}>{n}</option>)}<option>A single session</option></select></label>
      </div>
      <div className="fg">
        <label className="f"><span>Your name</span><input name="name" required defaultValue={profile?.name || ''} /></label>
        <label className="f"><span>Business or organisation (optional)</span><input name="org" /></label>
        <label className="f"><span>Your role</span><input name="role" placeholder="e.g. Founder, Manager" /></label>
      </div>
      <div className="fg">
        <label className="f"><span>Email</span><input type="email" name="email" required defaultValue={profile?.email || ''} /></label>
        <label className="f"><span>Phone or WhatsApp</span><input name="phone" defaultValue={profile?.phone || ''} /></label>
        <label className="f"><span>Best way to reach you</span><select name="contact"><option>Call</option><option>WhatsApp</option><option>Email</option><option>Video call</option></select></label>
      </div>
      <label className="f"><span>Where are you right now?</span><select name="stage">{['Running my own business', 'Individual contributor', 'Manager', 'Senior leader', 'Sorting out my personal finances'].map((x) => <option key={x}>{x}</option>)}</select></label>
      <label className="f"><span>What would you like help with?</span><textarea name="what" required maxLength={3000} placeholder="A few sentences about your situation" /></label>
      <label className="f"><span>What would a good result look like?</span><textarea name="result" maxLength={2000} /></label>
      <label className="f"><span>When would you like to start?</span><select name="urgency" defaultValue="This month"><option>This week</option><option>This month</option><option>This quarter</option><option>Just exploring</option></select></label>
      <p className="small muted" style={{ margin: 0 }}>🔒 What you share here is confidential and seen only by Awele.</p>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div><button className="btn lemon" disabled={busy}>{busy ? 'Sending…' : 'Request my discovery call'}</button></div>
    </form>
  );
}
