import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { site, trackHref, trackItems } from '../data/site';
import type { Course, Space, Track } from '../data/types';
import { useMyLearning } from '../lib/learning';
import { firstName, useAuth } from '../lib/auth';
import { useModals } from './Modals';
import { RightSide } from './RightSide';
import { initials } from '../pages/PublicPages';
import { CourseBanner } from '../pages/CoursePage';
import { AdminBanner, SpaceBanner, TrackBanner } from './Banners';

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#5b21b6" />
      <path d="M9 23 16 8l7 15" fill="none" stroke="#f5ec42" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 18h8" stroke="#f5ec42" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="top">
      <div className="in">
        <button className="iconbtn menu-btn" onClick={onMenu} aria-label="Open spaces">☰ Spaces</button>
        <Link className="brand" to="/"><Logo /><span>Awelen Entrepreneurs</span></Link>
        <span className="tl">Learning community</span>
        <Link className="btn lemon sm teach" to="/plans">🚀 <span className="t-long">Teach on Awelen</span><span className="t-short">Teach</span></Link>
      </div>
    </header>
  );
}

/* Home page hero banner: patterned shapes plus the photo inside the yellow ring. */
export function Banner() {
  const b = site.creator.banner;
  return (
    <section className="banner" aria-label="Welcome banner">
      <svg className="deco" viewBox="0 0 1400 280" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        <defs>
          <pattern id="bdots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.8" fill="#fff" opacity=".16" /></pattern>
        </defs>
        <rect x="0" y="0" width="560" height="280" fill="url(#bdots)" />
        <path d="M520 250 C 680 160, 800 300, 960 200 S 1200 110, 1400 170" fill="none" stroke="#fff" strokeWidth="2" opacity=".3" />
        <circle cx="1250" cy="40" r="130" fill="none" stroke="#f5ec42" strokeWidth="28" />
        <circle cx="1070" cy="275" r="105" fill="#7c3aed" opacity=".6" />
        <circle cx="1365" cy="255" r="62" fill="#121016" opacity=".6" />
        <g stroke="#f5ec42" strokeWidth="8" strokeLinecap="round">
          {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={870 + i * 26} y1="232" x2={920 + i * 26} y2="172" />)}
        </g>
        <circle cx="1150" cy="150" r="13" fill="#f5ec42" />
        <circle cx="985" cy="72" r="6" fill="#fff" opacity=".85" />
        <circle cx="760" cy="60" r="4" fill="#f5ec42" opacity=".9" />
      </svg>
      <svg className="bphoto" viewBox="0 0 1400 280" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        <defs><clipPath id="bphotoClip"><circle cx="1250" cy="40" r="118" /></clipPath></defs>
        <image href="/images/hero-photo.jpg" x="1134" y="-76" width="232" height="232" preserveAspectRatio="xMidYMid slice" clipPath="url(#bphotoClip)" />
        <circle cx="1250" cy="40" r="130" fill="none" stroke="#f5ec42" strokeWidth="28" />
      </svg>
      <div className="in">
        {b.kicker && <span className="kick">{b.kicker}</span>}
        <h2 className="bh">{b.headline}</h2>
        {b.sub && <p className="bs">{b.sub}</p>}
        <div className="row" style={{ marginTop: 4 }}>
          <Link className="btn lemon" to="/space/courses">Explore course tracks</Link>
          <Link className="btn onDark" to="/space/community">Join the conversation</Link>
        </div>
      </div>
    </section>
  );
}

export function UserBar() {
  const { session, profile } = useAuth();
  const { openAccount } = useModals();
  return (
    <div className="ubar">
      <div className="in">
        <span className="crumb small muted">{session ? `Welcome back, ${firstName(profile?.name)}` : 'Learning community'}</span>
        <div className="ub-acts">
          {session
            ? <Link className="ub" to="/account" aria-label="Your account"><span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }} aria-hidden="true">{initials(profile?.name)}</span><span className="lbl">My account</span></Link>
            : <button className="ub" onClick={() => openAccount('up')}><span aria-hidden="true">👤</span><span className="lbl">Join or sign in</span></button>}
          <Link className="ub" to="/space/contact" aria-label="Contact the creator"><span aria-hidden="true">✉️</span><span className="lbl">Contact</span></Link>
        </div>
      </div>
    </div>
  );
}

const TYPE_TAG: Record<string, string> = {
  course: 'course', post: 'post', event: 'event', members: 'database', affiliates: 'experts', crucible: 'ideation',
  ebooks: 'library', consult: 'services', announce: 'news', amld: 'programme', presence: 'programme', peer: 'circle',
};
const KIND_ICO: Record<string, string> = { video: '▶', pdf: '📄', quiz: '✍️' };

/* Left sidebar, as in the single-file app: categories of spaces; under Courses, each track with its courses
   (which open out into modules and lessons) and any spaces placed in that track. A space that belongs to a track,
   or is a track's home, shows under the track and not in its own category. */
export function LeftNav({ onNavigate }: { onNavigate: () => void }) {
  const { pathname } = useLocation();
  const { teamRole } = useAuth();
  const mine = useMyLearning();
  const unlocked = new Set(mine.filter(({ e }) => e.plan === 'free' || e.plan === 'granted' || e.amount_paid > 0).map(({ e }) => e.course_id));
  const [, sec, id, sub] = pathname.split('/');
  const activeCourse = sec === 'course' ? id : '';
  const [tog, setTog] = useState<Record<string, boolean>>({});
  const isOpen = (k: string, dflt: boolean) => (k in tog ? tog[k] : dflt);
  const flip = (k: string, dflt: boolean) => setTog((t) => ({ ...t, [k]: !(k in t ? t[k] : dflt) }));
  const visible = (sp: Space) => !sp.hidden || !!teamRole;
  const tIds = new Set(site.tracks.map((t) => t.id)), homes = new Set(site.tracks.map((t) => t.home).filter(Boolean));
  const on = (path: string) => pathname === path;

  const caret = (k: string, open: boolean, label: string) => (
    <button className={'tg' + (open ? ' open' : '')} onClick={() => flip(k, open)} aria-expanded={open} aria-label={(open ? 'Hide' : 'Show') + ' what is inside ' + label}>▸</button>
  );
  const noC = <span className="tg sp" aria-hidden="true" />;
  const spaceRow = (sp: Space, depth: number) => (
    <div className={'tr d' + depth} key={'s' + sp.id}>{noC}
      <Link to={'/space/' + sp.id} className={'tl' + (sec === 'space' && id === sp.id ? ' on' : '')} onClick={onNavigate}>
        <span className="ico">{sp.icon}</span>
        {sp.navSub ? <span className="nm">{sp.name}<span className="ns">{sp.navSub}</span></span> : <span className="nm">{sp.name}</span>}
        {sp.hidden ? <span className="ty">hidden</span> : TYPE_TAG[sp.type] && <span className="ty">{TYPE_TAG[sp.type]}</span>}
      </Link>
    </div>
  );
  const courseRows = (c: Course, depth: number) => {
    const k = 'c:' + c.id, open = isOpen(k, activeCourse === c.id), acc = unlocked.has(c.id);
    return (
      <div key={'c' + c.id}>
        <div className={'tr d' + depth}>{c.modules.length ? caret(k, open, c.title) : noC}
          <Link to={'/course/' + c.id} className={'tl' + (activeCourse === c.id && !sub ? ' on' : '')} onClick={onNavigate}>
            <span className="ico">{c.icon || '🎓'}</span><span className="nm">{c.title}</span><span className="ty">{acc ? 'unlocked' : '🔒'}</span>
          </Link>
        </div>
        {open && c.modules.map((m) => {
          const mk = 'm:' + m.id, mo = isOpen(mk, activeCourse === c.id && m.lessons.some((l) => l.id === sub));
          return (
            <div key={m.id}>
              <div className={'tr d' + (depth + 1)}>{m.lessons.length ? caret(mk, mo, m.title) : noC}
                <Link to={acc && m.lessons[0] ? `/course/${c.id}/${m.lessons[0].id}` : '/course/' + c.id} className="tl nmod" onClick={onNavigate}>
                  <span className="nm">{m.title}</span><span className="ty">{m.lessons.length}</span>
                </Link>
              </div>
              {mo && m.lessons.map((l) => (
                <div className={'tr d' + (depth + 2)} key={l.id}>{noC}
                  <Link to={acc ? `/course/${c.id}/${l.id}` : '/course/' + c.id} className={'tl nles' + (activeCourse === c.id && sub === l.id ? ' on' : '')} onClick={onNavigate}>
                    {acc ? <span className="lk" aria-hidden="true">{KIND_ICO[l.kind] || '•'}</span> : <span className="lk" aria-label="Locked">🔒</span>}<span className="nm">{l.title}</span>
                  </Link>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };
  const trackRows = (t: Track, i: number) => {
    const k = 't:' + t.id, open = isOpen(k, true), its = trackItems(t);
    const act = on('/track/' + t.id) || (!!t.home && on('/space/' + t.home));
    return (
      <div key={t.id}>
        <div className="tr d1 trkrow">{caret(k, open, t.title)}
          <Link className={'trk' + (act ? ' on' : '')} to={trackHref(t)} onClick={onNavigate}><span className="tn">Track {i + 1}</span><span className="tt">{t.title}</span></Link>
        </div>
        {open && (its.length ? its.map((it) => (it.k === 'course' ? courseRows(it.c, 2) : spaceRow(it.s, 2))) : <div className="tempty">No courses in this track yet</div>)}
      </div>
    );
  };

  return (
    <nav className="nav" aria-label="Categories, tracks and spaces">
      <div className="navhint"><span aria-hidden="true">👇 </span>Open a category, then a track, course, module or lesson.</div>
      {site.groups.map((g) => {
        const list = site.spaces.filter((sp) => sp.group === g.id && visible(sp) && !(sp.track && tIds.has(sp.track)) && !homes.has(sp.id));
        if (!list.length) return null;
        const k = 'g:' + g.id, open = isOpen(k, true);
        return (
          <div key={g.id}>
            <div className="tr cat"><button className="catn" onClick={() => flip(k, open)} aria-expanded={open}><span className={'tg' + (open ? ' open' : '')} aria-hidden="true">▸</span>{g.name}</button></div>
            {open && list.map((sp) => sp.type === 'course' ? (
              <div key={sp.id}>
                <div className="tr d1">{noC}<Link to={'/space/' + sp.id} className={'tl' + (on('/space/' + sp.id) ? ' on' : '')} onClick={onNavigate}><span className="ico">🗺️</span><span className="nm">All tracks at a glance</span></Link></div>
                {site.tracks.filter((t) => t.space === sp.id).map(trackRows)}
              </div>
            ) : spaceRow(sp, 1))}
          </div>
        );
      })}
      <div className="tr cat"><span className="catn" style={{ cursor: 'default' }}><span className="tg sp" aria-hidden="true" />For creators</span></div>
      <div className="tr d1">{noC}<Link to="/plans" className={'tl' + (on('/plans') ? ' on' : '')} onClick={onNavigate}><span className="ico">🚀</span><span className="nm">Teach on Awelen</span><span className="ty">plans</span></Link></div>
      {teamRole && <div className="tr d1">{noC}<Link to="/admin" className={'tl' + (pathname.startsWith('/admin') ? ' on' : '')} onClick={onNavigate}><span className="ico">⚙️</span><span className="nm">Admin portal</span><span className="ty">admin</span></Link></div>}
    </nav>
  );
}

export function Footer() {
  const c = site.creator;
  const link = (type: string, style?: string) => {
    const s = site.spaces.find((x) => x.type === type && !x.hidden && (!style || x.style === style));
    return s ? <li key={s.id}><Link to={'/space/' + s.id}>{s.name}</Link></li> : null;
  };
  const wa = (c.whatsapp || '').replace(/\D/g, '');
  return (
    <footer className="foot">
      <div className="in">
        <div className="fb">
          <Link className="brand" to="/"><Logo /><span>{c.banner.kicker}</span></Link>
          <p className="fl">{c.tagline ?? 'Clarity is everything.'}</p>
          <p className="small">{c.fdesc ?? c.banner.sub}</p>
        </div>
        <nav aria-label="Learn"><h4>Learn</h4><ul>{[link('course'), link('amld'), link('presence'), link('ebooks'), link('event', 'webinar'), link('event', 'coaching')]}</ul></nav>
        <nav aria-label="Solve and connect"><h4>Solve &amp; connect</h4><ul>{[link('crucible'), link('consult'), link('announce'), link('post'), link('members')]}</ul></nav>
        <div>
          <h4>Get in touch</h4>
          <ul className="small">
            <li>✉️ {c.email}</li><li>📞 {c.phone}</li>
            {wa && <li>💬 <a href={'https://wa.me/' + wa} target="_blank" rel="noopener">WhatsApp {c.whatsapp}</a></li>}
            <li>📍 {c.location}</li><li>🕘 {c.hours}</li>
          </ul>
        </div>
      </div>
      <div className="fbot">
        <div className="in2">
          <span>© {new Date().getFullYear()} {c.copy || c.banner.kicker}. All rights reserved.</span>
          <span>
            <Link to="/space/contact">Contact</Link> · <Link to="/plans">Teach on Awelen</Link> · <Link to="/admin">🔒 Admin access</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();
  const home = pathname === '/' || pathname === '/space/welcome';
  return (
    <>
      <TopBar onMenu={() => setDrawer((d) => !d)} />
      {home && <Banner />}
      {!home && pathname.startsWith('/space/') && <SpaceBanner id={pathname.split('/')[2]} />}
      {pathname.startsWith('/track/') && <TrackBanner id={pathname.split('/')[2]} />}
      {pathname.startsWith('/course/') && <CourseBanner id={pathname.split('/')[2]} />}
      {pathname.startsWith('/admin') && <AdminBanner />}
      <UserBar />
      <div className="layout">
        <aside className={'left' + (drawer ? ' open' : '')}><LeftNav onNavigate={() => setDrawer(false)} /></aside>
        <main className="stack" id="main">{children}</main>
        <aside className="right" aria-label="Activity"><RightSide /></aside>
      </div>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
      <Footer />
    </>
  );
}
