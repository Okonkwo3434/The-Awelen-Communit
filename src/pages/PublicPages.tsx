import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { site } from '../data/site';
import type { Announcement, Space } from '../data/types';
import { supabase } from '../lib/supabase';
import { firstName, niceError, useAuth } from '../lib/auth';
import { okEmail } from '../lib/visitor';
import { useModals } from '../components/Modals';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

/* ---------- Welcome: pinned message, how to find your way, guidelines ---------- */
export function WelcomePage({ s }: { s: Space }) {
  return (
    <article className="card pinned" id="welcome-msg" aria-labelledby="wm-h">
      <div className="pin-head"><span className="pin-flag">📌 Pinned · Please read first</span></div>
      <h1 id="wm-h">{s.headline}</h1>
      {(s.desc || '').split('\n\n').map((p, i) => <p key={i} className="lead">{p}</p>)}
      <h2>How to find your way around</h2>
      <div className="howto">
        <div><span className="hi" aria-hidden="true">👈</span><p><b>Pick a learning track in the sidebar.</b> Courses and programmes are grouped into numbered tracks. Click any course under a track and its description opens here. On a phone, tap <b>☰ Spaces</b> at the top to see the list.</p></div>
        <div><span className="hi" aria-hidden="true">🔒</span><p><b>Only unlocked courses open the full content.</b> Anyone can browse a course and see its outline. The lessons, downloads and certificate open once you unlock the course.</p></div>
        <div><span className="hi" aria-hidden="true">🏛️</span><p><b>On an advanced programme?</b> Read this page and introduce yourself first. Then AMLD learners head to <Link to="/space/amld">AMLD Programme</Link> and Executive Presence learners to <Link to="/space/presence">Executive Presence</Link>.</p></div>
      </div>
      <h2>Our community guidelines</h2>
      <div className="rules">
        {site.rules.map((r, i) => (
          <div key={i} className={'rule' + (r.hard ? ' hard' : '')}>
            <span className="ri" aria-hidden="true">{r.icon}</span>
            <div style={{ minWidth: 0 }}><b>{r.title}</b><p>{r.text}</p></div>
          </div>
        ))}
      </div>
    </article>
  );
}

/* ---------- Announcements: from Supabase, with the built-in list as a fallback ---------- */
function useAnnouncements() {
  const [list, setList] = useState<Announcement[]>(site.announcements);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('published_at', { ascending: false })
      .then(({ data, error }) => { if (!error && data && data.length) { setList(data as Announcement[]); setLive(true); } });
  }, []);
  return { list, live };
}

export function AnnouncementsPage({ s }: { s: Space }) {
  const { list } = useAnnouncements();
  const [cat, setCat] = useState('All');
  const cats = ['All', ...Array.from(new Set(list.map((a) => a.category)))];
  const shown = cat === 'All' ? list : list.filter((a) => a.category === cat);
  return (
    <>
      <section className="card">
        <h1>{s.headline || s.name}</h1>
        {s.desc && <p className="lead">{s.desc}</p>}
        <div className="row" role="group" aria-label="Filter by category">
          {cats.map((c) => <button key={c} className={'chip' + (c === cat ? ' on' : '')} aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      </section>
      {shown.map((a) => (
        <article key={a.id} className={'card ann' + (a.important ? ' imp' : '')}>
          <div className="row small muted"><span className="badge lemon">{a.category}</span>{a.pinned && <span>📌 Pinned</span>}<span>{fmtDate(a.published_at)}</span></div>
          <h2>{a.title}</h2>
          {a.body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </article>
      ))}
      {!shown.length && <div className="card empty">No announcements in this category yet.</div>}
    </>
  );
}

/* ---------- Contact: details plus a message form saved to Supabase ---------- */
export function ContactPage({ s }: { s: Space }) {
  const c = site.creator;
  const { profile } = useAuth();
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [msg, setMsg] = useState('');
  const wa = (c.whatsapp || '').replace(/\D/g, '');

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) || '').trim();
    const row = { name: g('name'), email: g('email').toLowerCase(), phone: g('phone') || null, topic: g('topic'), message: g('message') };
    if (!row.name || !okEmail(row.email) || !row.message) return setMsg('Please fill in your name, a valid email and your message.');
    if (!supabase) return setMsg(`Messages can't be sent from here yet. Please email ${c.email}.`);
    setState('busy'); setMsg('');
    const { error } = await supabase.from('contact_messages').insert(row);
    if (error) { setState('idle'); setMsg(niceError(error) + ` You can also email ${c.email}.`); return; }
    setState('sent');
  };

  return (
    <>
      <section className="card">
        <h1>{s.headline || 'Get in touch'}</h1>
        {s.desc && <p className="lead">{s.desc}</p>}
        <ul className="contactlist">
          <li>✉️ <a href={'mailto:' + c.email}>{c.email}</a></li>
          <li>📞 <a href={'tel:' + c.phone.replace(/\s/g, '')}>{c.phone}</a></li>
          {wa && <li>💬 <a href={'https://wa.me/' + wa} target="_blank" rel="noopener">WhatsApp {c.whatsapp}</a></li>}
          <li>📍 {c.location}</li>
          <li>🕘 {c.hours}</li>
        </ul>
      </section>
      <section className="card">
        {state === 'sent' ? (
          <div className="stack">
            <h2 style={{ margin: 0 }}>Thank you, your message is on its way</h2>
            <p style={{ margin: 0 }}>We usually reply within two working days. For anything urgent, WhatsApp is quickest.</p>
            <div><button className="btn quiet" onClick={() => setState('idle')}>Send another message</button></div>
          </div>
        ) : (
          <form className="stack" onSubmit={send}>
            <h2 style={{ margin: 0 }}>Send a message</h2>
            <div className="fg">
              <label className="f"><span>Full name</span><input name="name" required defaultValue={profile?.name || ''} autoComplete="name" /></label>
              <label className="f"><span>Email</span><input type="email" name="email" required defaultValue={profile?.email || ''} autoComplete="email" /></label>
              <label className="f"><span>Phone or WhatsApp (optional)</span><input name="phone" defaultValue={profile?.phone || ''} autoComplete="tel" /></label>
              <label className="f"><span>What is it about?</span>
                <select name="topic"><option>A course</option><option>Private coaching</option><option>Business Solutions</option><option>The Crucible Circle</option><option>Partnership or sponsorship</option><option>Something else</option></select>
              </label>
            </div>
            <label className="f"><span>Your message</span><textarea name="message" required maxLength={4000} rows={5} /></label>
            {msg && <p className="formmsg" role="alert">{msg}</p>}
            <div><button className="btn" disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Send message'}</button></div>
          </form>
        )}
      </section>
    </>
  );
}

/* ---------- Links ---------- */
export function LinksPage({ s }: { s: Space }) {
  return (
    <section className="card">
      <h1>{s.headline || s.name}</h1>
      {s.desc && <p className="lead">{s.desc}</p>}
      <div className="stack">
        {site.links.map((l) => <a key={l.id} className="mini" href={l.url} target="_blank" rel="noopener" style={{ display: 'block' }}><b>{l.label} ↗</b><br /><span className="small muted">{l.url}</span></a>)}
      </div>
    </section>
  );
}

/* ---------- Join (opens the account form) ---------- */
export function JoinPage() {
  const { openAccount } = useModals();
  const { session } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (session) nav('/account', { replace: true });
    else openAccount('up');
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="card">
      <h1>Join or sign in</h1>
      <p>Create a free account to post in the community, book sessions and unlock courses.</p>
      <div className="row"><button className="btn lemon" onClick={() => openAccount('up')}>Create account</button><button className="btn quiet" onClick={() => openAccount('in')}>Sign in</button></div>
    </section>
  );
}

/* ---------- My account ---------- */
export function AccountPage() {
  const { ready, session, profile, teamRole, signOut } = useAuth();
  const { openAccount } = useModals();
  const nav = useNavigate();
  if (!ready) return <div className="card empty">Loading…</div>;
  if (!session) {
    return (
      <section className="card">
        <h1>Your account</h1>
        <p>Please sign in to see your account.</p>
        <div className="row"><button className="btn" onClick={() => openAccount('in')}>Sign in</button><button className="btn quiet" onClick={() => openAccount('up')}>Create account</button></div>
      </section>
    );
  }
  return (
    <section className="card">
      <div className="pf"><span className="avatar" style={{ width: 72, height: 72, fontSize: 27 }} aria-hidden="true">{initials(profile?.name)}</span>
        <div><h1 style={{ margin: 0 }}>Welcome, {firstName(profile?.name)}</h1><div className="muted small">{profile?.email || session.user.email}</div>
          <span className="badge" style={{ marginTop: 6 }}>{teamRole === 'admin' ? 'Admin' : teamRole === 'editor' ? 'Team editor' : 'Member'}</span></div>
      </div>
      <h3 style={{ marginTop: 18 }}>My courses</h3>
      <p className="small muted">Courses you unlock will appear here. <Link to="/space/courses">Browse the course tracks</Link>.</p>
      <div className="row" style={{ marginTop: 14 }}>
        <Link className="btn quiet sm" to="/space/intro">🙋 Introduce yourself</Link>
        <button className="btn quiet sm" onClick={async () => { await signOut(); nav('/'); }}>Sign out</button>
      </div>
    </section>
  );
}

export const initials = (n?: string | null) => String(n || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/* ---------- Reset password (opened from the emailed link) ---------- */
export function ResetPasswordPage() {
  const { ready, session, setNewPassword } = useAuth();
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const nav = useNavigate();
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const a = String(fd.get('pw') || ''), b = String(fd.get('pw2') || '');
    if (a.length < 8) return setMsg('Your password needs at least 8 characters.');
    if (a !== b) return setMsg('The two passwords do not match.');
    try { await setNewPassword(a); setDone(true); setTimeout(() => nav('/account'), 1500); } catch (err) { setMsg(niceError(err)); }
  };
  if (!ready) return <div className="card empty">Loading…</div>;
  if (!session) return <div className="card empty">This reset link has expired or was already used. Use “Forgot password?” on the sign-in form to get a new one.</div>;
  return (
    <section className="card">
      {done ? <><h1>Password changed</h1><p>You are signed in. Taking you to your account…</p></> : (
        <form className="stack" onSubmit={save}>
          <h1 style={{ margin: 0 }}>Choose a new password</h1>
          <div className="fg">
            <label className="f"><span>New password</span><input type="password" name="pw" required minLength={8} autoComplete="new-password" /></label>
            <label className="f"><span>Type it again</span><input type="password" name="pw2" required minLength={8} autoComplete="new-password" /></label>
          </div>
          {msg && <p className="formmsg" role="alert">{msg}</p>}
          <div><button className="btn">Save new password</button></div>
        </form>
      )}
    </section>
  );
}
