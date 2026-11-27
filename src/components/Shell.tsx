import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { site } from '../data/site';
import { firstName, useAuth } from '../lib/auth';
import { useModals } from './Modals';
import { initials } from '../pages/PublicPages';
import { CourseBanner } from '../pages/CoursePage';

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

export function LeftNav({ onNavigate }: { onNavigate: () => void }) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setClosed((c) => ({ ...c, [k]: !c[k] }));
  const { teamRole } = useAuth();
  const spaces = site.spaces.filter((s) => !s.hidden || !!teamRole);   // hidden spaces (Faculty Lounge) show for the team only

  return (
    <nav className="nav" aria-label="Categories, tracks and spaces">
      <div className="navhint">Open a category, then a track, course, module or lesson.</div>
      {site.groups.map((g) => {
        const open = !closed[g.id];
        const inGroup = spaces.filter((s) => s.group === g.id);
        if (!inGroup.length && g.id !== 'tracks') return null;
        return (
          <div key={g.id}>
            <div className="tr cat">
              <button className="catn" onClick={() => toggle(g.id)} aria-expanded={open}>
                <span className={'tg' + (open ? ' open' : '')} aria-hidden="true">▸</span>{g.name}
              </button>
            </div>
            {open && g.id === 'tracks' && (
              <>
                <NavRow to="/space/courses" icon="🗺️" name="All tracks at a glance" onClick={onNavigate} />
                {site.tracks.map((t, i) => (
                  <div className="tr d1 trkrow" key={t.id}>
                    <span className="tg sp" aria-hidden="true" />
                    <NavLink className="trk" to={'/track/' + t.id} onClick={onNavigate}>
                      <span className="tn">Track {i + 1}</span><span className="tt">{t.title}</span>
                    </NavLink>
                  </div>
                ))}
              </>
            )}
            {open && g.id !== 'tracks' && inGroup.map((s) => (
              <NavRow key={s.id} to={'/space/' + s.id} icon={s.icon} name={s.name} sub={s.navSub} tag={TYPE_TAG[s.type]} onClick={onNavigate} />
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function NavRow(p: { to: string; icon: string; name: string; sub?: string; tag?: string; onClick: () => void }) {
  return (
    <div className="tr d1">
      <span className="tg sp" aria-hidden="true" />
      <NavLink to={p.to} className={({ isActive }) => 'tl' + (isActive ? ' on' : '')} onClick={p.onClick}>
        <span className="ico">{p.icon}</span>
        {p.sub ? <span className="nm">{p.name}<span className="ns">{p.sub}</span></span> : <span className="nm">{p.name}</span>}
        {p.tag && <span className="ty">{p.tag}</span>}
      </NavLink>
    </div>
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
      {pathname.startsWith('/course/') && <CourseBanner id={pathname.split('/')[2]} />}
      <UserBar />
      <div className="layout">
        <aside className={'left' + (drawer ? ' open' : '')}><LeftNav onNavigate={() => setDrawer(false)} /></aside>
        <main className="stack" id="main">{children}</main>
        <aside className="right" aria-label="Activity" />
      </div>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
      <Footer />
    </>
  );
}
