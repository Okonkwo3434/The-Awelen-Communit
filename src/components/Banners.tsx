// Full-width banners, as in the single-file app: every space has its own patterned banner in its colour theme,
// every track has a dark track banner, and the admin portal has its own.
import { Link } from 'react-router-dom';
import type { Space, Track } from '../data/types';
import { site, spaceById, trackById, trackItems, trackNo, trackOfSpace } from '../data/site';
import { useAuth } from '../lib/auth';

const THEMES: Record<string, { bg: string; a: string; b: string; c: string }> = {
  lemon: { bg: '#f5ec42', a: '#121016', b: '#5b21b6', c: '#ffffff' }, ink: { bg: '#121016', a: '#f5ec42', b: '#7c3aed', c: '#ffffff' },
  lilac: { bg: '#ece3fb', a: '#5b21b6', b: '#121016', c: '#f5ec42' }, paper: { bg: '#ffffff', a: '#121016', b: '#f5ec42', c: '#7c3aed' },
  crimson: { bg: '#7f1d1d', a: '#f5ec42', b: '#f87171', c: '#121016' },
};
// Same small hash as the single-file app, so each space keeps the same pattern.
const hash = (s: string) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return 'l' + (h >>> 0).toString(36); };

function Deco({ id, theme }: { id: string; theme: string }) {
  const T = THEMES[theme] || THEMES.lemon, n = parseInt(hash(id).slice(1), 36), o = n % 90, pid = 'g' + hash(id + theme);
  return (
    <svg className="deco" viewBox="0 0 640 150" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <defs><pattern id={pid} width="14" height="14" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill={T.a} opacity=".16" /></pattern></defs>
      <rect width="640" height="150" fill={T.bg} /><rect width="230" height="150" fill={`url(#${pid})`} />
      <rect x="560" y="-30" width="90" height="90" rx="8" fill={T.c} stroke={T.a} strokeWidth="3" transform="rotate(18 605 15)" />
      {[0, 1, 2].map((i) => <path key={i} d={`M${250 + o / 3 + i * 24} 52l18 28-18 28`} fill="none" stroke={T.a} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity={1 - i * 0.25} />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={420 + o / 2 + i * 30} y={36 + ((n >> (i * 2)) % 6) * 14} width="18" height="200" rx="9" fill={i % 3 === 1 ? T.b : T.a} />)}
    </svg>
  );
}

const TYPE_BADGE: Record<string, [string, string?]> = {
  announce: ['Official updates'], amld: ['Programme · AMLD', 'lemon'], presence: ['Programme · Capstone'], peer: ['Peer circle · senior leaders', 'lemon'],
  crucible: ['Ideation · invite-only', 'lemon'], ebooks: ['Library'], consult: ['Consultancy'], course: ['Course space'], post: ['Post space', 'lemon'],
  members: ['Database'], affiliates: ['Affiliates', 'lemon'],
};
const EVENT_STYLE: Record<string, string> = { coaching: 'Coaching', hangout: 'Hangout', webinar: 'Webinar' };

function TypeBadge({ s }: { s: Space }) {
  if (s.type === 'event') return <span className="badge grey">Event space · {EVENT_STYLE[s.style || ''] || 'Event'}</span>;
  const b = TYPE_BADGE[s.type];
  return b ? <span className={'badge' + (b[1] ? ' ' + b[1] : '')}>{b[0]}</span> : null;
}

export function SpaceBanner({ id }: { id: string }) {
  const { teamRole } = useAuth();
  const s = spaceById(id);
  if (!s || (s.hidden && !teamRole)) return null;
  const theme = s.theme || 'lemon', T = THEMES[theme] || THEMES.lemon, dark = !!s.img || theme === 'ink' || theme === 'crimson';
  const t = trackOfSpace(s);
  return (
    <section className={'sbf' + (dark ? ' dark' : '')} style={{ ['--sbg' as string]: s.img ? 'rgba(18,16,22,.86)' : T.bg }} aria-label={s.name + ' banner'}>
      {s.img ? <div className="sbf-img" style={{ backgroundImage: `url('${s.img}')` }} /> : <Deco id={s.id} theme={theme} />}
      <div className="sbf-shade" />
      <div className="in">
        <span className="ic" aria-hidden="true">{s.icon}</span>
        <div className="tx">
          <div className="row"><span className="sb-name">{s.name}</span><TypeBadge s={s} />{t && <span className="badge grey">Track {trackNo(t)}</span>}</div>
          <h1>{s.headline || s.name}</h1>
          {s.desc && <p className="ds" style={{ whiteSpace: 'pre-line' }}>{s.desc}</p>}
        </div>
      </div>
    </section>
  );
}

export function TrackBanner({ id }: { id: string }) {
  const t: Track | undefined = trackById(id);
  if (!t) return null;
  const n = trackNo(t), sp = spaceById(t.space), its = trackItems(t), nc = its.filter((x) => x.k === 'course').length, no = its.length - nc;
  const pl = (k: number, w: string) => `${k} ${w}${k === 1 ? '' : 's'}`;
  return (
    <section className="cbf" aria-label="Track banner">
      <div className="in">
        <nav className="small crumbs" aria-label="Breadcrumb"><Link to={'/space/' + t.space}>{sp?.name || 'Courses'}</Link> › <b style={{ color: '#fff' }}>Track {n}</b></nav>
        <div style={{ marginTop: 14 }}><span className="badge lemon">Track {n} of {site.tracks.length}</span></div>
        <h1>{t.title}</h1>
        {t.desc && <p style={{ margin: 0 }}>{t.desc}</p>}
        <div className="meta">{nc > 0 && <span>{pl(nc, 'course')}</span>}{no > 0 && <span>{pl(no, 'offering')}</span>}</div>
      </div>
    </section>
  );
}

export function AdminBanner() {
  const { teamRole } = useAuth();
  return (
    <section className="cbf" aria-label="Admin banner">
      <div className="in">
        <div><span className="badge lemon">{teamRole === 'admin' ? 'Admin' : teamRole === 'editor' ? 'Team editor' : 'Team only'}</span></div>
        <h1>Admin portal</h1>
        <p style={{ margin: 0 }}>Run the community from one place: requests and applications, payments, members, events, lesson media, eBooks, announcements and the team.</p>
      </div>
    </section>
  );
}
