import { Link, useParams } from 'react-router-dom';
import { site, spaceById, trackById, coursesInTrack, naira } from '../data/site';
import { AnnouncementsPage, ContactPage, LinksPage, WelcomePage } from './PublicPages';

/* Phase 1 pages: structure and content carried over from seed.json.
   Each space gets its full features as it moves over (see PROGRESS.md). */

function Moving({ what }: { what: string }) {
  return (
    <p className="small muted" style={{ margin: '12px 0 0' }}>
      🚧 {what} is being moved over from the original build. The full features arrive in a later phase.
    </p>
  );
}

export function SpacePage() {
  const { id = 'welcome' } = useParams();
  const s = spaceById(id);
  if (!s || s.hidden) return <div className="card empty">This space no longer exists. <Link to="/">Go to Welcome</Link></div>;

  if (s.type === 'welcome') return <WelcomePage s={s} />;
  if (s.type === 'announce') return <AnnouncementsPage s={s} />;
  if (s.type === 'contact') return <ContactPage s={s} />;
  if (s.type === 'links') return <LinksPage s={s} />;

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
      {s.id !== 'welcome' && <Moving what={`The ${s.name} space`} />}
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
            <span className="small muted">{c.modules} modules · {c.lessons} lessons · {c.price > 0 ? naira(c.price) : 'Free'}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CoursePage() {
  const { id = '' } = useParams();
  const c = site.courses.find((x) => x.id === id);
  if (!c) return <div className="card empty">Course not found. <Link to="/space/courses">See all courses</Link></div>;
  const t = trackById(c.track);
  return (
    <section className="card">
      {t && <Link className="small" to={'/track/' + t.id}>← {t.title}</Link>}
      <h1 style={{ marginTop: 8 }}>{c.headline || c.title}</h1>
      {c.sub && <p className="lead">{c.sub}</p>}
      <p className="small muted">{c.modules} modules · {c.lessons} lessons · {c.price > 0 ? naira(c.price) : 'Free'}</p>
      <Moving what="The course outline, lessons and payment" />
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
