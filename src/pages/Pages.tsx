import { Link, useParams } from 'react-router-dom';
import { site, spaceById, trackById, trackHref, trackItems, lessonCount } from '../data/site';
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
        <h2 style={{ marginTop: 0 }}>All tracks at a glance</h2>
        <div className="stack">
          {site.tracks.filter((t) => t.space === s.id).map((t, i) => {
            const its = trackItems(t), nc = its.filter((x) => x.k === 'course').length;
            return (
              <Link key={t.id} className="mini" to={trackHref(t)} style={{ display: 'block' }}>
                <b>Track {i + 1}: {t.title}</b><br />
                <span className="small muted">{t.home ? its.map((x) => x.title).join(' · ') : `${nc} course${nc === 1 ? '' : 's'}`}</span>
              </Link>
            );
          })}
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
  const items = trackItems(t), i = site.tracks.indexOf(t), prev = site.tracks[i - 1], next = site.tracks[i + 1];
  const nc = items.filter((x) => x.k === 'course').length, home = t.home ? spaceById(t.home) : undefined;
  const first = (x?: string) => String(x || '').split(/\n\s*\n/)[0];
  return (
    <>
      {home && (
        <section className="card guide spread"><span><b>{home.icon} {home.name}</b><br /><span className="small">{home.headline}</span></span>
          <Link className="btn sm" to={'/space/' + home.id}>Open {home.name} →</Link></section>
      )}
      {nc > 0 && <div className="notice small"><b>🔒 Browse freely, unlock to learn.</b> Open any course to read its full description and outline. The lessons open once you unlock it.</div>}
      {items.length ? items.map((it, k) => {
        const course = it.k === 'course' ? it.c : null, sp = it.k === 'space' ? it.s : null;
        const sub = course ? course.sub : sp!.headline, desc = course ? course.desc : sp!.desc;
        return (
          <article className="card offer" key={it.href}>
            <span className="oi" aria-hidden="true">{it.icon}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span className="tnum">{k + 1} of {items.length}</span>
              <h2>{it.title}</h2>
              {sub && <p className="muted" style={{ margin: '0 0 10px' }}>{sub}</p>}
              {desc && <p>{first(desc)}</p>}
              {course && <div className="small muted">{course.modules.length} modules · {lessonCount(course)} lessons · <span className="price">{priceLine(course)}</span></div>}
              <div className="row" style={{ marginTop: 12 }}><Link className="btn" to={it.href}>{course ? 'Read about this course' : 'Open ' + it.title} →</Link></div>
            </div>
          </article>
        );
      }) : <div className="card empty">No courses in this track yet.</div>}
      <div className="spread">
        {prev ? <Link className="btn quiet sm" to={trackHref(prev)}>← Track {i}: {prev.title}</Link> : <span />}
        {next ? <Link className="btn quiet sm" to={trackHref(next)}>Track {i + 2}: {next.title} →</Link> : <span />}
      </div>
    </>
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
