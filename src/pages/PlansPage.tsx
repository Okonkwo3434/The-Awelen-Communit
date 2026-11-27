// Teach on Awelen, carried over from the single-file app (plansView): where a creator chooses a plan and subscribes
// to run their own learning community on the platform, built like Awelen Community, for their own courses.
// A sign-up goes to the admin inbox (kind "creator"); the team sets the community up and, for paid plans,
// takes the first payment before it goes live.
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { dollars } from '../data/site';
import { TIERS, lim, rank, tierById, type Tier } from '../data/plans';
import { niceError, useAuth } from '../lib/auth';
import { sendEnquiry } from '../lib/community';
import { Dialog, Faq, Howto, Sent, Steps, fields } from '../components/Kit';

type Cycle = 'monthly' | 'yearly';
const yearly = (t: Tier) => (t.price || 0) * 10;

function PriceBig({ t, cycle }: { t: Tier; cycle: Cycle }) {
  if (t.price == null) return <div className="pr">Custom</div>;
  if (!t.price) return <div className="pr">Free</div>;
  return (
    <div className="pr">
      {dollars(cycle === 'yearly' ? yearly(t) : t.price)}
      <span className="small muted" style={{ fontFamily: 'var(--sans)' }}> /{cycle === 'yearly' ? 'year' : 'month'}</span>
    </div>
  );
}

export function PlansBanner() {
  const go = () => document.getElementById('tiers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <section className="cbf" aria-label="Teach on Awelen banner">
      <div className="in">
        <div><span className="badge lemon">For course creators</span></div>
        <h1>Teach on Awelen: run your own learning community</h1>
        <p style={{ margin: 0 }}>Get your own app like Awelen Community for your training courses: courses, community, coaching, events and payments in one place. Start free, then choose the plan that fits as you grow.</p>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn lemon" onClick={go}>See the plans</button>
          <button className="btn onDark" onClick={() => window.dispatchEvent(new CustomEvent('awelen:creator-signup', { detail: 'starter' }))}>Start free</button>
        </div>
      </div>
    </section>
  );
}

export function PlansPage() {
  const { teamRole } = useAuth();
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [pick, setPick] = useState<Tier['id'] | ''>('');

  // The banner's "Start free" button lives outside this page, so it asks for the form with an event.
  useEffect(() => {
    const open = (e: Event) => setPick(((e as CustomEvent).detail as Tier['id']) || 'starter');
    window.addEventListener('awelen:creator-signup', open);
    return () => window.removeEventListener('awelen:creator-signup', open);
  }, []);

  const seg = (
    <div className="seg" role="group" aria-label="Billing period">
      <button className={cycle === 'monthly' ? 'on' : ''} aria-pressed={cycle === 'monthly'} onClick={() => setCycle('monthly')}>Monthly</button>
      <button className={cycle === 'yearly' ? 'on' : ''} aria-pressed={cycle === 'yearly'} onClick={() => setCycle('yearly')}>Yearly · 2 months free</button>
    </div>
  );

  const yes = (b: boolean) => (b ? '✓' : '–');
  const rows: [string, (t: Tier) => string][] = [
    ['Price a month', (t) => (t.price == null ? 'Custom' : t.price ? dollars(t.price) : 'Free')],
    ['Price a year', (t) => (t.price == null ? 'Custom' : t.price ? dollars(yearly(t)) : 'Free')],
    ['Courses', (t) => lim(t.courses)],
    ['Learners', (t) => lim(t.learners)],
    ['AI writing a month', (t) => lim(t.ai)],
    ['Plugins', (t) => (t.plugins ? String(t.plugins) : 'All')],
    ['Team editors', (t) => (t.id === 'inst' ? 'By contract' : t.team ? String(t.team) : '–')],
    ['Platform fee on course sales', (t) => (t.price == null ? 'By contract' : t.fee + '%')],
    ['Installment payments and promo codes', (t) => yes(rank(t.id) >= 1)],
    ['Certificates', (t) => yes(rank(t.id) >= 1)],
    ['Paid coaching and event bookings', (t) => yes(rank(t.id) >= 2)],
    ['eBook library and affiliate programme', (t) => yes(rank(t.id) >= 2)],
    ['Your own web address and branding', (t) => yes(rank(t.id) >= 3)],
    ['Programmes, cohorts and applications', (t) => yes(rank(t.id) >= 3)],
    ['Many creators, white label, single sign-on', (t) => yes(t.id === 'inst')],
  ];

  return (
    <>
      <section className="card" id="tiers">
        <div className="spread">
          <div><h2 style={{ margin: 0 }}>Choose your plan</h2><p className="small muted" style={{ margin: '4px 0 0' }}>Start free with one course. Upgrade or downgrade at any time. Prices are in US dollars.</p></div>
          {seg}
        </div>
        <div className="tiers" style={{ marginTop: 14 }}>
          {TIERS.map((t) => (
            <article key={t.id} className={'card tier' + (t.popular ? ' pop' : '')}>
              {t.popular && <span className="badge lemon" style={{ alignSelf: 'flex-start' }}>Most popular</span>}
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{t.name}</h3>
              <p className="small muted" style={{ margin: 0 }}>{t.blurb}</p>
              <PriceBig t={t} cycle={cycle} />
              {cycle === 'yearly' && !!t.price && <p className="small muted" style={{ margin: '-6px 0 0' }}>Works out at {dollars(Math.round((yearly(t) / 12) * 100) / 100)} a month</p>}
              <ul>{t.feats.map((f) => <li key={f}>{f}</li>)}</ul>
              <p className="small muted" style={{ margin: 0 }}>{t.price == null ? 'Fees agreed by contract' : t.fee + '% platform fee on course sales'}</p>
              {t.price == null
                ? <button className="btn quiet" onClick={() => setPick('inst')}>Talk to us</button>
                : <button className={'btn' + (t.popular ? ' lemon' : '')} onClick={() => setPick(t.id)}>{t.price ? 'Choose ' + t.name : 'Start free'}</button>}
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Your own app, like Awelen Community</h2>
        <p>Everything you see on this site is what you get for your own training: the same welcome page, sidebar, course tracks, courses, modules and lessons, community spaces, events, coaching and admin portal, under your name and your colours. You bring your knowledge; the platform handles members, payments and progress.</p>
        <Howto list={[
          ['🏠', 'Your own community.', 'Welcome page and guidelines, announcements, introductions, posts, events and a member database.'],
          ['🗺️', 'Courses in tracks.', 'Group courses into numbered tracks, with modules and lessons that open one after another and track each learner\'s progress.'],
          ['🎥', 'Video, PDF and notes.', 'Lessons play videos from YouTube, Vimeo, Bunny Stream or Google Drive, with PDFs, notes, worksheets and written reflections.'],
          ['💳', 'Paid access.', 'Learners unlock courses by paying in full or in installments, by card, bank transfer or USSD. Promo codes and offers are built in.'],
          ['🤝', 'Coaching and events.', 'Run hangouts, webinars and one-to-one coaching, free or paid, with seats and bookings.'],
          ['⚙️', 'Admin portal.', 'One place for payments, people, enquiries, lesson media, announcements and your team.'],
        ]} />
      </section>

      <section className="card">
        <h2>How it works</h2>
        <Steps list={[
          ['Choose a plan and tell us about your training', 'Pick a plan, name your community and tell us what you teach. Starter is free.'],
          ['We set up your community', 'Your community is created with your banner, welcome message and colours. Paid plans start once your community is ready.'],
          ['Build your courses', 'Add tracks, courses, modules and lessons, with AI help for scripts, notes and quizzes.'],
          ['Invite learners and get paid', 'Learners pay through Paystack, bank transfer or LinPay, and the money goes to your account.'],
          ['Grow', 'Add plugins, run events and coaching, and move up a plan when you need more room.'],
        ]} />
      </section>

      <section className="card">
        <h2>Every plan includes</h2>
        <Howto list={[
          ['🏠', 'Your own community.', 'Welcome page, spaces, posts, events and a member database.'],
          ['🎓', 'Course builder.', 'Tracks, courses, modules and lessons you can add to at any time.'],
          ['✨', 'AI writing help.', 'Draft scripts, notes, quizzes and posts, then edit them yourself.'],
          ['🔒', 'Secure sign-in.', 'Member accounts, password reset and lessons that open only for learners who have paid.'],
        ]} />
      </section>

      <section className="card" style={{ padding: 0 }}>
        <h2 style={{ padding: '18px 18px 0' }}>Compare plans</h2>
        <div className="tablewrap">
          <table className="mtable" style={{ minWidth: 720 }}>
            <thead><tr><th>Feature</th>{TIERS.map((t) => <th key={t.id}>{t.name}</th>)}</tr></thead>
            <tbody>{rows.map(([k, f]) => <tr key={k}><td><b>{k}</b></td>{TIERS.map((t) => <td key={t.id}>{f(t)}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className="small muted" style={{ padding: '0 18px 16px', margin: '10px 0 0' }}>The platform fee is a share of each course sale. Paystack's own transaction charges come on top of it. Monthly and yearly subscriptions are paid in advance.</p>
      </section>

      <section className="card">
        <h2>Questions creators ask</h2>
        <Faq list={[
          ['Is Starter really free?', 'Yes. You can run one course for up to 100 learners without paying a subscription. A 10% platform fee applies only when a learner pays for a course.'],
          ['Do I need technical skills?', 'No. You add courses, lessons and videos through simple forms, and we help you set up your community at the start.'],
          ['Who receives the money from my course sales?', 'You do. Learners pay into your account; the platform fee for your plan is deducted from each sale.'],
          ['Can I change plans later?', 'Yes. Move up or down at any time. If you move down, nothing is deleted, but you can\'t add more until you are within the new plan\'s limits.'],
          ['How does yearly billing work?', 'You pay for 10 months and get 12. Growth, for example, is $200 a year instead of $240.'],
          ['What happens when I sign up?', 'Your sign-up comes to our team. We contact you, set up your community and, for paid plans, take your first payment when your community is ready to go live.'],
        ]} />
      </section>

      <section className="card guide spread">
        <span><b>Ready to teach?</b><br /><span className="small">Start free with one course, or talk to us about the plan that fits your training.</span></span>
        <div className="row"><button className="btn lemon" onClick={() => setPick('growth')}>Choose Growth</button><button className="btn quiet" onClick={() => setPick('starter')}>Start free</button></div>
      </section>

      {teamRole === 'admin' && (
        <section className="card">
          <div className="spread"><h2 style={{ margin: 0 }}>Creator sign-ups</h2><Link className="btn quiet sm" to="/admin/inbox?kind=creator">📥 Open in the inbox</Link></div>
          <p className="small muted" style={{ margin: '6px 0 0' }}>Only you see this. Every sign-up from this page arrives in the admin inbox as "Creator sign-up", with the plan, billing and what they teach. Prices and limits are set in <code>src/data/plans.ts</code>.</p>
        </section>
      )}

      <SignupDialog pick={pick} cycle={cycle} onClose={() => setPick('')} />
    </>
  );
}

function SignupDialog({ pick, cycle, onClose }: { pick: Tier['id'] | ''; cycle: Cycle; onClose: () => void }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState('');
  const inst = pick === 'inst';
  const close = () => { setSent(''); setMsg(''); onClose(); };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const g = fields(e.currentTarget);
    const t = tierById(inst ? 'inst' : g('plan')) || TIERS[0];
    const cyc = (g('cycle') || cycle) as Cycle;
    setBusy(true); setMsg('');
    try {
      await sendEnquiry({
        kind: 'creator', name: g('name'), email: g('email'), phone: g('phone'), org: g('community'), role: g('role'),
        details: {
          plan: t.name, billing: t.price ? (cyc === 'yearly' ? 'Yearly' : 'Monthly') : '–',
          price: t.price == null ? 'Custom' : t.price ? dollars(cyc === 'yearly' ? yearly(t) : t.price) + (cyc === 'yearly' ? ' a year' : ' a month') : 'Free',
          teaches: g('teaches'), courses: g('courses'), learners: g('learners'), website: g('website'), note: g('note'),
        },
      });
      setSent(g('community'));
    } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!pick} onClose={close}>
      {sent ? (
        <Sent title={`Thank you. ${sent} is on its way`} onAgain={close} again="Back to plans">
          <p style={{ margin: 0 }}>{inst
            ? 'We will contact you within two working days to understand your institution\'s needs and agree a plan.'
            : 'We will contact you within two working days to set up your community. For paid plans, your first payment is taken only when your community is ready to go live.'}</p>
        </Sent>
      ) : (
        <form className="stack" onSubmit={submit}>
          <div>
            <h2 style={{ margin: 0 }}>{inst ? 'Talk to us about your institution' : 'Start your learning community'}</h2>
            <p className="small muted" style={{ margin: '4px 0 0' }}>{inst ? 'Tell us about your organisation and the training you run.' : 'Set up your own space on Awelen for your courses, members and events.'}</p>
          </div>
          <div className="fg">
            <label className="f"><span>Your name</span><input name="name" required maxLength={160} defaultValue={profile?.name || ''} /></label>
            <label className="f"><span>{inst ? 'Institution or company' : 'Community name'}</span><input name="community" required maxLength={200} placeholder={inst ? 'e.g. University Enterprise Centre' : 'e.g. Kano Agro Academy'} /></label>
          </div>
          <div className="fg">
            <label className="f"><span>Email</span><input type="email" name="email" required maxLength={200} defaultValue={profile?.email || ''} /></label>
            <label className="f"><span>Phone or WhatsApp</span><input name="phone" maxLength={60} defaultValue={profile?.phone || ''} /></label>
          </div>
          {inst && <label className="f"><span>Your role</span><input name="role" maxLength={160} placeholder="e.g. Head of Training" /></label>}
          <label className="f"><span>What do you teach?</span><textarea name="teaches" required maxLength={2000} placeholder={inst ? 'The programmes you run and who they are for' : 'Your subject and who your learners are, e.g. poultry farming for new farmers'} /></label>
          <div className="fg">
            <label className="f"><span>Courses you plan to run</span><select name="courses"><option>1</option><option>2 to 3</option><option>4 to 10</option><option>More than 10</option></select></label>
            <label className="f"><span>Learners you expect in the first year</span><select name="learners"><option>Under 100</option><option>100 to 500</option><option>500 to 2,000</option><option>2,000 to 10,000</option><option>More than 10,000</option></select></label>
          </div>
          {!inst && (
            <div className="fg">
              <label className="f"><span>Plan</span>
                <select name="plan" defaultValue={pick}>{TIERS.filter((x) => x.price != null).map((x) => <option key={x.id} value={x.id}>{x.name} · {x.price ? dollars(x.price) + '/month' : 'Free'}</option>)}</select>
              </label>
              <label className="f"><span>Billing</span>
                <select name="cycle" defaultValue={cycle}><option value="monthly">Monthly</option><option value="yearly">Yearly (2 months free)</option></select>
              </label>
            </div>
          )}
          <label className="f"><span>Website or social page (optional)</span><input name="website" maxLength={300} placeholder="https://" /></label>
          <label className="f"><span>Anything else we should know? (optional)</span><textarea name="note" maxLength={2000} /></label>
          <label className="row small" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><input type="checkbox" required style={{ width: 'auto', marginTop: 3 }} /> I agree to the creator terms and the community guidelines.</label>
          {msg && <p className="notice warn small" role="alert" style={{ margin: 0 }}>{msg}</p>}
          <div><button className="btn lemon" disabled={busy}>{busy ? 'Sending…' : inst ? 'Send' : 'Create my community'}</button></div>
        </form>
      )}
    </Dialog>
  );
}
