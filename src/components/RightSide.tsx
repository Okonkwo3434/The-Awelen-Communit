// Right sidebar, as in the single-file app (rightSide()): what a person sees depends on who they are.
//   Visitors: a "Join the community" card.
//   Members: My learning, with progress in each course.
//   Team editors and admins: Team tools (links into the admin portal) and a few live counts.
//   Everyone: the latest announcement, the next three events and the latest community posts.
// Everything is read through Supabase's security rules, so nobody sees more here than they may see elsewhere.
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { courseById, lessonCount, site, spaceById } from '../data/site';
import type { Announcement } from '../data/types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useMyLearning } from '../lib/learning';
import { ago } from '../lib/community';
import { useModals } from './Modals';
import { Avatar } from './Kit';

type SideEvent = { id: string; space: string; title: string; starts_at: string };
type SidePost = { id: string; space: string; author_name: string; is_creator: boolean; body: string; created_at: string };

const visibleSpace = (id: string, team: boolean) => {
  const s = spaceById(id);
  return !!s && (!s.hidden || team);
};

/** Reloads when the page changes, so a new post or event shows up after moving around the site. */
function useSideData(team: boolean) {
  const { pathname } = useLocation();
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [events, setEvents] = useState<SideEvent[] | null>(null);
  const [posts, setPosts] = useState<SidePost[] | null>(null);
  const [upcoming, setUpcoming] = useState<number | null>(null);

  useEffect(() => {
    // Fallback while offline or before the announcements table has rows: the built-in list.
    const builtIn = [...site.announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.published_at.localeCompare(a.published_at))[0] || null;
    if (!supabase) { setAnn(builtIn); setEvents([]); setPosts([]); setUpcoming(0); return; }
    let live = true;
    const feedSpaces = site.spaces
      .filter((s) => (s.type === 'post' || s.type === 'intro') && (!s.hidden || team))
      .map((s) => s.id);
    Promise.all([
      supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('published_at', { ascending: false }).limit(1),
      supabase.from('events').select('id,space,title,starts_at').gt('starts_at', new Date().toISOString()).order('starts_at').limit(200),
      feedSpaces.length
        ? supabase.from('posts').select('id,space,author_name,is_creator,body,created_at').in('space', feedSpaces).order('created_at', { ascending: false }).limit(3)
        : Promise.resolve({ data: [], error: null }),
    ]).then(([a, e, p]) => {
      if (!live) return;
      setAnn(!a.error && a.data && a.data.length ? (a.data[0] as Announcement) : builtIn);
      const ahead = ((e.data || []) as SideEvent[]).filter((x) => visibleSpace(x.space, team));
      setEvents(ahead.slice(0, 3));
      setUpcoming(ahead.length);
      setPosts((p.data || []) as SidePost[]);
    }, () => {
      if (live) { setAnn(builtIn); setEvents([]); setPosts([]); setUpcoming(0); }
    });
    return () => { live = false; };
  }, [pathname, team]);

  return { ann, events, posts, upcoming };
}

function JoinCard() {
  const { openAccount } = useModals();
  return (
    <div className="card guide">
      <h3>Join the community</h3>
      <p className="small">Introduce yourself, post questions, RSVP to hangouts and unlock courses.</p>
      <div className="row">
        <button className="btn" onClick={() => openAccount('up')}>Join free</button>
        <button className="btn ghost sm" onClick={() => openAccount('in')}>Sign in</button>
      </div>
    </div>
  );
}

function MyLearningCard() {
  const rows = useMyLearning();
  return (
    <div className="card">
      <h3>My learning</h3>
      {rows.length ? rows.map(({ e, done }) => {
        const c = courseById(e.course_id);
        if (!c) return null;
        const total = lessonCount(c) || 1;
        const pct = Math.min(100, Math.round((done / total) * 100));
        const owing = e.plan === 'installments' && e.amount_paid < e.amount_due;
        return (
          <Link key={e.course_id} className="mini" to={'/course/' + c.id} style={{ display: 'block' }}>
            <b>{c.title}</b>
            <div className="progress" style={{ margin: '4px 0' }}><span style={{ width: pct + '%' }} /></div>
            <span className="small muted">{pct}% complete{owing ? ' · installment due' : ''}</span>
          </Link>
        );
      }) : <p className="small muted">No courses yet.</p>}
      <Link className="small" to="/space/courses">Browse courses →</Link>
    </div>
  );
}

function TeamCard({ role, upcoming }: { role: 'admin' | 'editor'; upcoming: number | null }) {
  const [toConfirm, setToConfirm] = useState<number | null>(null);
  useEffect(() => {
    if (!supabase || role !== 'admin') return;
    supabase.rpc('admin_counts').then(({ data }) => {
      const c = data as { payment_requests?: number; bookings?: number } | null;
      if (c) setToConfirm((c.payment_requests || 0) + (c.bookings || 0));
    });
  }, [role]);
  const lessons = site.courses.reduce((t, c) => t + lessonCount(c), 0);
  return (
    <div className="card">
      <h3>{role === 'admin' ? 'Creator tools' : 'Editor tools'}</h3>
      <div className="tools">
        <Link className="btn sm" to="/admin">⚙️ Admin portal</Link>
        {role === 'admin' && <Link className="btn quiet sm" to="/admin/inbox">📥 Inbox</Link>}
        {role === 'admin' && <Link className="btn quiet sm" to="/admin/money">🧾 Payments{toConfirm ? ` · ${toConfirm} to confirm` : ''}</Link>}
        <Link className="btn quiet sm" to="/admin/media">🎥 Lesson media &amp; eBooks</Link>
        <Link className="btn quiet sm" to="/admin/events">＋ New event</Link>
        <Link className="btn quiet sm" to="/admin/news">📣 New announcement</Link>
        {role === 'admin' && <Link className="btn quiet sm" to="/admin/promos">🏷️ Promo offers</Link>}
        {role === 'admin' && <Link className="btn quiet sm" to="/admin/people">👥 People</Link>}
        <Link className="btn quiet sm" to="/space/community">＋ New post</Link>
      </div>
      <div className="stat" style={{ marginTop: 12 }}>
        <div><b>{site.spaces.filter((s) => !s.hidden).length}</b><span>Spaces</span></div>
        <div><b>{site.courses.length}</b><span>Courses</span></div>
        <div><b>{lessons}</b><span>Lessons</span></div>
        <div><b>{upcoming ?? '–'}</b><span>Upcoming events</span></div>
      </div>
    </div>
  );
}

function AnnouncementCard({ a }: { a: Announcement }) {
  const fresh = Date.now() - new Date(a.published_at).getTime() < 7 * 86400000;
  return (
    <div className="card">
      <div className="spread"><h3 style={{ margin: 0 }}>📣 Announcements</h3>{fresh && <span className="badge">New</span>}</div>
      <Link className="mini" to="/space/news" style={{ display: 'block', marginTop: 6 }}>
        <b>{a.title}</b><br /><span className="small muted">{a.category} · {ago(a.published_at)}</span>
      </Link>
      <Link className="small" to="/space/news">All announcements →</Link>
    </div>
  );
}

function UpcomingCard({ list }: { list: SideEvent[] | null }) {
  return (
    <div className="card">
      <h3>Upcoming</h3>
      {list === null ? <p className="small muted">Loading…</p> : list.length ? list.map((e) => {
        const d = new Date(e.starts_at);
        const day = d.toLocaleString('en-GB', { day: 'numeric', timeZone: 'Africa/Lagos' });
        const mon = d.toLocaleString('en-GB', { month: 'short', timeZone: 'Africa/Lagos' });
        return (
          <Link key={e.id} className="mini" to={'/space/' + e.space}>
            <span className="date" style={{ width: 46, padding: '3px 0' }}><b style={{ fontSize: '1.1rem' }}>{day}</b><span>{mon}</span></span>
            <span><b>{e.title}</b><br /><span className="muted small">{spaceById(e.space)?.name}</span></span>
          </Link>
        );
      }) : <p className="small muted">No upcoming events.</p>}
    </div>
  );
}

function LatestPostsCard({ list }: { list: SidePost[] | null }) {
  return (
    <div className="card">
      <h3>Latest posts</h3>
      {list === null ? <p className="small muted">Loading…</p> : list.length ? list.map((p) => {
        const name = p.is_creator ? site.creator.name : p.author_name;
        const text = p.body.replace(/\s+/g, ' ');
        return (
          <Link key={p.id} className="mini" to={'/space/' + p.space}>
            <Avatar name={name} size={28} creator={p.is_creator} />
            <span><b>{name}</b> <span className="muted">{text.slice(0, 54)}{text.length > 54 ? '…' : ''}</span></span>
          </Link>
        );
      }) : <p className="small muted">No posts yet.</p>}
    </div>
  );
}

export function RightSide() {
  const { ready, session, teamRole } = useAuth();
  const { ann, events, posts, upcoming } = useSideData(!!teamRole);
  return (
    <>
      {ready && !session && <JoinCard />}
      {session && !teamRole && <MyLearningCard />}
      {teamRole && <TeamCard role={teamRole} upcoming={upcoming} />}
      {ann && <AnnouncementCard a={ann} />}
      <UpcomingCard list={events} />
      <LatestPostsCard list={posts} />
    </>
  );
}
