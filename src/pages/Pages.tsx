import { Link, useParams } from 'react-router-dom';
import { site, spaceById, trackById, coursesInTrack, lessonCount } from '../data/site';
import { priceLine } from '../components/Kit';
import { useAuth } from '../lib/auth';
import { IntroPage, PostSpacePage } from './community/Feed';
import { EventSpacePage } from './community/Events';
import { AffiliatesPage, MembersPage } from './community/People';
import { ConsultPage, CruciblePage } from './community/Solve';
import { EbooksPage } from './community/Library';
import { AmldPage, PresencePage } from './community/Programmes';
import { AnnouncementsPage, ContactPage, LinksPage, WelcomePage } from './PublicPages';

/* Space pages: each space type has its own page (Phase 2 public side, Phase 4 community and programmes). */

function Moving({ what }: { what: string }) {
  return <p className="small muted" style={{ margin: '12px 0 0' }}>🚧 {what} arrives in a later phase.</p>;
}

export function SpacePage() {
  const { id = 'welcome' } = useParams();
  const s = spaceById(id);
  const { teamRole } = useAuth();
  if (!s || (s.hidden && !teamRole)) return <div className="card empty">This space no longer exists. <Link to="/">Go to Welcome</Link></div>;

  if (s.type === 'welcome') return <WelcomePage s={s} />;
  if (s.type === 'announce') return <AnnouncementsPage s={s} />;
  if (s.type === 'contact') return <ContactPage s={s} />;
  if (s.type === 'links') return <LinksPage s={s} />;
  if (s.type === 'intro') return <IntroPage s={s} />;
  if (s.type === 'post' || s.type === 'peer') return <PostSpacePage s={s} />;
  if (s.type === 'event') return <EventSpacePage s={s} />;
  if (s.type === 'members') return <MembersPage s={s} />;
  if (s.type === 'affiliates') return <AffiliatesPage s={s} />;
  if (s.type === 'crucible') return <CruciblePage s={s} />;
  if (s.type === 'consult') return <ConsultPage s={s} />;
  if (s.type === 'ebooks') return <EbooksPage s={s} />;
  if (s.type === 'amld') return <AmldPage s={s} />;
  if (s.type === 'presence') return <PresencePage s={s} />;

  if (s.type === 'course') {
    return (
      <section className="card">
        <h1>{s.headline || s.name}</h1>
        {s.desc && <p className="lead">{s.desc}</p>}
        <div className="stack">
          {site.tracks.map((t, i) => (
            <Link key={t.id} className="mini" to={'/track/' + t.id} style={{ display: 'block' }}>
              <b>Track {i + 1}: {t.title}</b><br /><span className="small muted">{coursesInTrack(t.id).length} courses</span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <article className={'card' + (s.id === 'welcome' ? ' pinned' : '')}>
      {s.id === 'welcome' && <div className="pin-head"><span className="pin-flag">📌 Pinned · Please read first</span></div>}
      <h1>{s.headline || s.name}</h1>
      {s.desc && s.desc.split('\n\n').map((para, i) => <p key={i} className={i === 0 ? 'lead' : ''}>{para}</p>)}
    </article>
  );
}

export function TrackPage() {
  const { id = '' } = useParams();
  const t = trackById(id);
  if (!t) return <div className="card empty">This track no longer exists. <Link to="/">Go to Welcome</Link></div>;
  const n = site.tracks.indexOf(t) + 1;
  return (
    <section className="card">
      <span className="badge lemon">Track {n}</span>
      <h1 style={{ marginTop: 8 }}>{t.title}</h1>
      {t.desc && <p className="lead">{t.desc}</p>}
      <div className="stack">
        {coursesInTrack(t.id).map((c) => (
          <Link key={c.id} className="mini" to={'/course/' + c.id} style={{ display: 'block' }}>
            <b>{c.title}</b><br />
            <span className="small muted">{c.modules.length} modules · {lessonCount(c)} lessons · {priceLine(c)}</span>
          </Link>
        ))}
        {site.spaces.filter((sp) => sp.track === t.id && !sp.hidden).map((sp) => (
          <Link key={sp.id} className="mini" to={'/space/' + sp.id} style={{ display: 'block' }}>
            <b>{sp.icon} {sp.name}</b><br />
            <span className="small muted">{sp.navSub || sp.headline}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SimplePage({ title, text }: { title: string; text: string }) {
  return (
    <section className="card">
      <h1>{title}</h1>
      <p>{text}</p>
      <Moving what={title} />
    </section>
  );
}
