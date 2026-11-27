// Network: the Member database and Affiliate members (find an expert, and the affiliate programme).
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Space } from '../../data/types';
import { cm, site } from '../../data/site';
import prog from '../../data/programmes.json';
import { niceError, useAuth } from '../../lib/auth';
import {
  applyAffiliate, fmtDay, loadMyProfile, saveMyProfile, sendEnquiry, useDirectory, useExperts, useMyAffiliate,
  type Expert, type Member, type MyProfile,
} from '../../lib/community';
import { useModals } from '../../components/Modals';
import { Avatar, Dialog, Sent, SpaceHead, Stats, Steps, Tabs, fields } from '../../components/Kit';

const STAGES = prog.stages as string[];
const CATS = prog.cats as string[];
const DAY = 86400000;

/* ---------- Member database ---------- */
export function MembersPage({ s }: { s: Space }) {
  const { session } = useAuth();
  const { openAccount } = useModals();
  const [bump, setBump] = useState(0);
  const ms = useDirectory(bump);
  const [q, setQ] = useState(''); const [stage, setStage] = useState(''); const [city, setCity] = useState('');
  const [view, setView] = useState<Member | null>(null);
  const [edit, setEdit] = useState(false);
  const list = useMemo(() => (ms || []).slice().sort((a, b) => (a.is_me ? -1 : b.is_me ? 1 : a.name.localeCompare(b.name))), [ms]);
  const cities = [...new Set(list.map((m) => m.city).filter(Boolean))].sort();
  const key = (m: Member) => [m.name, m.headline, m.business, m.city, m.skills.join(' ')].join(' ').toLowerCase();
  const shown = list.filter((m) => (!q || key(m).includes(q.toLowerCase())) && (!stage || m.stage === stage) && (!city || m.city === city));

  return (
    <>
      <SpaceHead s={s}>
        <Stats list={[[list.length, 'Members'], [cities.length, 'Cities'], [list.filter((m) => m.is_expert).length, 'Affiliate experts'], [list.filter((m) => Date.now() - new Date(m.joined_at).getTime() < 30 * DAY).length, 'Joined in 30 days']]} />
        {session && <div className="row" style={{ marginTop: 12 }}><button className="btn quiet sm" onClick={() => setEdit(true)}>✎ Edit my profile</button></div>}
      </SpaceHead>
      {!session && <div className="notice spread" style={{ marginBottom: 14 }}><span>Join free to open full profiles and list yourself here.</span><button className="btn sm" onClick={() => openAccount('up')}>Join free</button></div>}
      <div className="card mfilter">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, business, skill or city" aria-label="Search members" />
        <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filter by business stage"><option value="">All stages</option>{STAGES.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter by city"><option value="">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {ms === null ? <div className="card empty">Loading members…</div>
        : !shown.length ? <p className="card empty">{list.length ? 'No members match your search.' : 'No members are listed yet. Join and fill in your profile to be the first.'}</p>
        : (
          <div className="grid">
            {shown.map((m) => (
              <button key={m.profile_id} className="card tile mcard" onClick={() => setView(m)}>
                <Avatar name={m.name} size={46} />
                <b>{m.name}{m.is_me && <> <span className="badge">You</span></>}</b>
                {m.headline && <span className="small muted">{m.headline}</span>}
                {(m.city || m.stage) && <span className="small">📍 {[m.city, m.stage && m.stage + ' stage'].filter(Boolean).join(' · ')}</span>}
                {session && m.skills.length > 0 && <span className="tags">{m.skills.slice(0, 3).map((t) => <span className="tag" key={t}>{t}</span>)}</span>}
                {m.is_expert && <span className="badge lemon">Affiliate expert</span>}
              </button>
            ))}
          </div>
        )}
      <Dialog open={!!view} onClose={() => setView(null)}>{view && <MemberCard m={view} signedIn={!!session} />}</Dialog>
      <Dialog open={edit} onClose={() => setEdit(false)}><ProfileForm onSaved={() => { setEdit(false); setBump((b) => b + 1); }} /></Dialog>
    </>
  );
}

function MemberCard({ m, signedIn }: { m: Member; signedIn: boolean }) {
  return (
    <div className="stack">
      <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={m.name} size={64} />
        <div style={{ minWidth: 0 }}><h2 style={{ margin: 0 }}>{m.name}</h2><div className="muted">{m.headline}</div></div></div>
      <div className="fg">
        {m.business && <div><div className="small muted">Business</div>{m.business}</div>}
        {m.city && <div><div className="small muted">City</div>{m.city}</div>}
        {m.stage && <div><div className="small muted">Stage</div>{m.stage}</div>}
        <div><div className="small muted">Joined</div>{fmtDay(m.joined_at)}</div>
      </div>
      {signedIn ? (
        <>
          {m.bio && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{m.bio}</p>}
          {m.skills.length > 0 && <span className="tags">{m.skills.map((t) => <span className="tag" key={t}>{t}</span>)}</span>}
          {m.is_expert && <p className="small" style={{ margin: 0 }}>💼 Affiliate expert. <Link to="/space/affiliates">Request an introduction</Link>.</p>}
        </>
      ) : <div className="notice small">Join free to see the full profile.</div>}
    </div>
  );
}

function ProfileForm({ onSaved }: { onSaved: () => void }) {
  const { session } = useAuth();
  const uid = session?.user.id || '';
  const [p, setP] = useState<MyProfile | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (uid) loadMyProfile(uid).then(setP).catch((e) => setMsg(niceError(e))); }, [uid]);
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const g = fields(e.currentTarget);
    const fd = new FormData(e.currentTarget);
    setBusy(true); setMsg('');
    try {
      await saveMyProfile(uid, {
        name: g('name').slice(0, 120), phone: g('phone') || null, city: g('city') || null, headline: g('headline') || null,
        business: g('business') || null, stage: g('stage') || null, bio: g('bio') || null, listed: fd.get('listed') === 'on',
        skills: g('skills').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12),
      });
      onSaved();
    } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };
  if (!p) return <p className="muted">{msg || 'Loading your profile…'}</p>;
  return (
    <form className="stack" onSubmit={save}>
      <h2>Your profile</h2>
      <p className="small muted" style={{ margin: 0 }}>Other members see this in the Member database. Your email and phone are never shown.</p>
      <div className="fg">
        <label className="f"><span>Name</span><input name="name" required defaultValue={p.name} /></label>
        <label className="f"><span>City</span><input name="city" defaultValue={p.city || ''} placeholder="e.g. Lagos" /></label>
        <label className="f"><span>Phone (private)</span><input name="phone" defaultValue={p.phone || ''} /></label>
      </div>
      <label className="f"><span>Headline</span><input name="headline" maxLength={120} defaultValue={p.headline || ''} placeholder="e.g. Aspiring agro-processor" /></label>
      <div className="fg">
        <label className="f"><span>Business</span><input name="business" maxLength={160} defaultValue={p.business || ''} placeholder="e.g. Cassava flour (planning)" /></label>
        <label className="f"><span>Business stage</span><select name="stage" defaultValue={p.stage || ''}><option value="">Not set</option>{STAGES.map((x) => <option key={x}>{x}</option>)}</select></label>
      </div>
      <label className="f"><span>Skills (separate with commas)</span><input name="skills" defaultValue={(p.skills || []).join(', ')} placeholder="e.g. Operations, Logistics" /></label>
      <label className="f"><span>About you</span><textarea name="bio" maxLength={1500} defaultValue={p.bio || ''} /></label>
      <label className="row small" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><input type="checkbox" name="listed" defaultChecked={p.listed} style={{ width: 'auto', marginTop: 3 }} /> Show me in the Member database</label>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button></div>
    </form>
  );
}

/* ---------- Affiliate members ---------- */
export function AffiliatesPage({ s }: { s: Space }) {
  const { sub } = useParams();
  const tab = sub === 'market' ? 'market' : 'about';
  const [bump, setBump] = useState(0);
  return (
    <>
      <SpaceHead s={s}><Tabs s={s} label="Affiliate sections" tab={tab} list={[['about', '🔎 Find an expert'], ['market', '📣 Affiliate marketing']]} /></SpaceHead>
      <ApplyCard bump={bump} onApplied={() => setBump((b) => b + 1)} />
      {tab === 'about' ? <Experts /> : <Market bump={bump} />}
    </>
  );
}

function ApplyCard({ bump, onApplied }: { bump: number; onApplied: () => void }) {
  const { session } = useAuth();
  const { openAccount } = useModals();
  const mine = useMyAffiliate(bump);
  const [open, setOpen] = useState(false);
  const rate = site.affiliate.rate;
  if (!session) return <div className="card guide spread"><span><b>Have a skill other founders need?</b><br /><span className="small">Join, then apply to become an affiliate expert.</span></span><button className="btn sm" onClick={() => openAccount('up')}>Join free</button></div>;
  if (mine?.status === 'pending') return <div className="notice" style={{ marginBottom: 14 }}><b>Your affiliate application is under review.</b> <span className="small">Awele reviews applications personally.</span></div>;
  if (mine?.status === 'approved') return null;
  if (mine?.status === 'declined') return <div className="notice small" style={{ marginBottom: 14 }}>Your last affiliate application was not accepted this time. <Link to="/space/contact">Contact us</Link> if you'd like to talk about it.</div>;
  return (
    <>
      <div className="card guide spread"><span><b>Have a skill other founders need?</b><br /><span className="small">Become an affiliate expert: get listed here and earn {rate}% on courses you refer.</span></span><button className="btn sm" onClick={() => setOpen(true)}>Apply to be an affiliate</button></div>
      <Dialog open={open} onClose={() => setOpen(false)}><AffApply onDone={() => { setOpen(false); onApplied(); }} /></Dialog>
    </>
  );
}

function AffApply({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const g = fields(e.currentTarget);
    setBusy(true); setMsg('');
    try { await applyAffiliate({ expertise: g('expertise'), category: g('category'), offer: g('offer'), rate: g('rate') }); onDone(); }
    catch (err) { setMsg(/duplicate key/i.test(niceError(err)) ? 'You have already applied.' : niceError(err)); } finally { setBusy(false); }
  };
  return (
    <form className="stack" onSubmit={submit}>
      <h2>Apply to be an affiliate</h2>
      <p className="small muted" style={{ margin: 0 }}>Approved affiliates are listed as experts and get a personal link that earns {site.affiliate.rate}% on course payments.</p>
      <label className="f"><span>Your area of expertise</span><input name="expertise" required maxLength={160} placeholder="e.g. Bookkeeping & tax filing" /></label>
      <label className="f"><span>Category</span><select name="category">{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="f"><span>What you offer members</span><textarea name="offer" required maxLength={2000} placeholder="What you do, how long it takes, what they get" /></label>
      <label className="f"><span>Typical price</span><input name="rate" maxLength={120} placeholder="e.g. From ₦50,000 per project" /></label>
      <label className="row small" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><input type="checkbox" required style={{ width: 'auto', marginTop: 3 }} /> I will promote honestly, tell people I earn a commission, and not make income promises on Awelen's behalf.</label>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Submit application'}</button></div>
    </form>
  );
}

function Experts() {
  const ex = useExperts();
  const { session } = useAuth();
  const { openAccount } = useModals();
  const [q, setQ] = useState(''); const [cat, setCat] = useState('');
  const [intro, setIntro] = useState<Expert | null>(null);
  const cats = [...new Set((ex || []).map((m) => m.category))].sort();
  const key = (m: Expert) => [m.name, m.business, m.city, m.expertise, m.category, m.offer, (m.skills || []).join(' ')].join(' ').toLowerCase();
  const shown = (ex || []).filter((m) => (!q || key(m).includes(q.toLowerCase())) && (!cat || m.category === cat));
  return (
    <>
      <div className="card mfilter">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="What do you need help with? e.g. tax, logo, contracts" aria-label="Search experts" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by area"><option value="">All areas</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {ex === null ? <div className="card empty">Loading experts…</div>
        : !shown.length ? <p className="card empty">{ex.length ? 'No experts match. Try another word, or ask in the Community.' : 'Our first affiliate experts are being approved. Check back soon, or ask in the Community.'}</p>
        : (
          <div className="grid">
            {shown.map((m) => (
              <article className="card xcard" key={m.profile_id}>
                <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={m.name} size={40} /><div style={{ minWidth: 0 }}><b>{m.name}</b><div className="small muted">{[m.business, m.city].filter(Boolean).join(' · ')}</div></div></div>
                <span><span className="badge">{m.category}</span></span>
                <h3>{m.expertise}</h3>
                <p className="small muted" style={{ margin: 0 }}>{m.offer}</p>
                {m.skills?.length > 0 && <span className="tags">{m.skills.map((t) => <span className="tag" key={t}>{t}</span>)}</span>}
                <div className="spread"><span className="small"><b>{m.rate}</b></span><button className="btn sm" onClick={() => (session ? setIntro(m) : openAccount('up'))}>Request introduction</button></div>
              </article>
            ))}
          </div>
        )}
      <Dialog open={!!intro} onClose={() => setIntro(null)}>{intro && <IntroForm m={intro} />}</Dialog>
    </>
  );
}

function IntroForm({ m }: { m: Expert }) {
  const { profile, session } = useAuth();
  const [sent, setSent] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const g = fields(e.currentTarget);
    setBusy(true); setMsg('');
    try {
      await sendEnquiry({ kind: 'intro', name: profile?.name || 'Member', email: profile?.email || session?.user.email || '', phone: profile?.phone || '',
        details: { to_profile: m.profile_id, to_name: m.name, expertise: m.expertise, msg: g('msg') } });
      setSent(true);
    } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };
  if (sent) return <Sent title="Request sent"><p style={{ margin: 0 }}>Awele will introduce you to {m.name} by email.</p></Sent>;
  return (
    <form className="stack" onSubmit={submit}>
      <h2>Request an introduction</h2>
      <p className="muted small" style={{ margin: 0 }}>Awele will introduce you to <b>{m.name}</b> ({m.expertise}) by email.</p>
      <label className="f"><span>What do you need help with?</span><textarea name="msg" required maxLength={2000} placeholder="A sentence or two about your business and what you need" /></label>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button></div>
    </form>
  );
}

function Market({ bump }: { bump: number }) {
  const P = site.affiliate;
  const mine = useMyAffiliate(bump);
  const a = mine?.status === 'approved' ? mine : null;
  const base = window.location.origin;
  const refUrl = (code: string, cid?: string) => `${base}/${cid ? 'course/' + cid : ''}?ref=${code}`;
  const [copied, setCopied] = useState('');
  const copy = (u: string) => { navigator.clipboard?.writeText(u).then(() => { setCopied(u); setTimeout(() => setCopied(''), 1500); }); };
  const paid = site.courses.filter((c) => c.mode === 'paid' && c.price > 0);
  return (
    <>
      {a?.code && (
        <div className="card">
          <div className="spread"><h2 style={{ margin: 0 }}>Your affiliate links</h2><span className="badge lemon">Code {a.code}</span></div>
          <p className="small muted" style={{ margin: '8px 0' }}>Your personal link to the community. Course links are listed below.</p>
          <div className="reflink"><code>{refUrl(a.code)}</code><button className="btn lemon sm" onClick={() => copy(refUrl(a.code!))}>{copied === refUrl(a.code) ? 'Copied ✓' : 'Copy'}</button></div>
          <p className="small muted" style={{ margin: '10px 0 0' }}>Your sales and commission dashboard arrives with the admin portal. Until then, Awele shares your referred sales with you directly.</p>
        </div>
      )}
      <div className="card"><h2>How the affiliate programme works</h2>
        <Steps list={[['Apply and get approved', 'Tell us your expertise. Approved affiliates are also listed under Find an expert.'],
          ['Share your personal link', 'Every course has its own link with your code attached.'],
          [`Earn ${P.rate}% commission`, `On payments made within ${P.cookie} days of someone clicking your link. Installment plans pay commission on each installment received.`],
          ['Get paid', `Request a payout once your balance reaches the equivalent of ₦${P.min.toLocaleString('en-NG')}. Payouts go to your bank account.`]]} />
      </div>
      <div className="card"><h2>Courses you can promote</h2>
        {paid.map((c) => (
          <div className="dlrow" key={c.id}>
            <span style={{ flex: 1, minWidth: 0 }}><b>{c.title}</b><br /><span className="small muted">{cm(c, c.price)}{c.instN > 1 && c.instAmt > 0 ? ` or ${c.instN} × ${cm(c, c.instAmt)}` : ''}</span></span>
            <span className="small" style={{ textAlign: 'right' }}>You earn<br /><b>{cm(c, Math.round(c.price * P.rate) / 100)}</b></span>
            {a?.code && <button className="btn quiet sm" onClick={() => copy(refUrl(a.code!, c.id))}>{copied === refUrl(a.code, c.id) ? 'Copied ✓' : 'Copy link'}</button>}
          </div>
        ))}
      </div>
    </>
  );
}
