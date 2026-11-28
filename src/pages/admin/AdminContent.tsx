// Admin portal: Events and bookings, Lesson media and eBooks, Announcements, and the Team.
import { useState, type FormEvent } from 'react';
import { site, flatLessons } from '../../data/site';
import { niceError, useAuth } from '../../lib/auth';
import { Dialog } from '../../components/Kit';
import { Loading, day, dayTime, db, fromLocalInput, money, namesFor, q, toLocalInput, useLoad } from './common';

/* ---------- Events ---------- */
type Ev = { id: string; space: string; title: string; starts_at: string; mins: number; host: string; description: string; seats: number; price: number; currency: string; taken: number };
type Bk = { event_id: string; user_id: string; status: string; created_at: string };
const eventSpaces = site.spaces.filter((s) => s.type === 'event');

export function EventsTab() {
  const { teamRole } = useAuth();
  const [edit, setEdit] = useState<Ev | 'new' | null>(null);
  const [show, setShow] = useState<string>('');
  const [past, setPast] = useState(false);
  const { data, error, reload } = useLoad(async () => {
    const evs = await q<Ev[]>(db().from('events').select('*').order('starts_at'));
    const bks = await q<Bk[]>(db().from('event_bookings').select('*').neq('status', 'cancelled'));
    const names = teamRole === 'admin' ? await namesFor(bks.map((b) => b.user_id)) : {};
    return { evs, bks, names };
  }, [teamRole]);
  if (!data) return <Loading error={error} what="events" />;
  const now = Date.now();
  const list = data.evs.filter((e) => past || new Date(e.starts_at).getTime() > now - 86400000);
  const spaceName = (id: string) => site.spaces.find((s) => s.id === id)?.name || id;
  const setStatus = async (b: Bk, status: string) => { await db().from('event_bookings').update({ status }).eq('event_id', b.event_id).eq('user_id', b.user_id); reload(); };
  return (
    <>
      <section className="card"><div className="spread"><h2 style={{ margin: 0 }}>Events and sessions</h2><button className="btn sm" onClick={() => setEdit('new')}>＋ New event</button></div>
        <p className="small muted" style={{ margin: '6px 0 0' }}>Coaching sessions, hangouts and live events. Times are Lagos time. Free events book straight away; sessions with a fee are held until you mark them paid (Money tab).</p>
        <label className="row small" style={{ marginTop: 8 }}><input type="checkbox" checked={past} onChange={(e) => setPast(e.target.checked)} style={{ width: 'auto' }} /> Show past events</label>
      </section>
      {list.map((e) => {
        const bks = data.bks.filter((b) => b.event_id === e.id), dt = new Date(e.starts_at);
        return (
          <article className="card ev" key={e.id}>
            <div className="date"><b>{dt.getDate()}</b><span>{dt.toLocaleString('en', { month: 'short' })}</span></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="spread"><h3 style={{ margin: 0 }}>{e.title}</h3><button className="btn ghost sm" onClick={() => setEdit(e)}>✎ Edit</button></div>
              <div className="small muted">{spaceName(e.space)} · {dayTime(e.starts_at)} · {e.mins} min · {e.host} · {e.price > 0 ? money(e.price, e.currency) : 'Free'}</div>
              <div className="small" style={{ marginTop: 6 }}><b>{e.taken}</b> of {e.seats} places taken {bks.length > 0 && <button className="btn ghost sm" onClick={() => setShow(show === e.id ? '' : e.id)}>{show === e.id ? 'Hide' : 'See'} who</button>}</div>
              {show === e.id && bks.map((b) => (
                <div className="dlrow" key={b.user_id}>
                  <span style={{ flex: 1 }}>{data.names[b.user_id]?.name || 'Member ' + b.user_id.slice(0, 6)}<br /><span className="small muted">{data.names[b.user_id]?.email || ''} · booked {day(b.created_at)}</span></span>
                  <select value={b.status} onChange={(x) => setStatus(b, x.target.value)} style={{ width: 'auto' }}><option value="booked">Booked</option><option value="awaiting payment">Awaiting payment</option><option value="paid">Paid</option><option value="cancelled">Cancel</option></select>
                </div>))}
            </div>
          </article>
        );
      })}
      {!list.length && <div className="card empty">No upcoming events. Add one with ＋ New event.</div>}
      <Dialog open={!!edit} onClose={() => setEdit(null)}>{edit && <EventForm e={edit === 'new' ? null : edit} onDone={() => { setEdit(null); reload(); }} />}</Dialog>
    </>
  );
}

function EventForm({ e, onDone }: { e: Ev | null; onDone: () => void }) {
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const save = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault(); const fd = new FormData(ev.currentTarget); const g = (k: string) => String(fd.get(k) || '').trim();
    const row = { space: g('space'), title: g('title'), starts_at: fromLocalInput(g('when')), mins: Number(g('mins')) || 60, host: g('host'), description: g('description'), seats: Number(g('seats')) || 0, price: Number(g('price')) || 0, currency: g('currency') };
    if (!row.starts_at) return setMsg('Choose a date and time.');
    setBusy(true); setMsg('');
    try { await q(e ? db().from('events').update(row).eq('id', e.id) : db().from('events').insert(row)); onDone(); } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };
  const del = async () => { if (!e || !confirm('Delete this event? Anyone booked loses their place.')) return; try { await q(db().from('events').delete().eq('id', e.id)); onDone(); } catch (err) { setMsg(niceError(err)); } };
  return (
    <form className="stack" onSubmit={save}>
      <h2>{e ? 'Edit event' : 'New event'}</h2>
      <div className="fg">
        <label className="f"><span>Where it appears</span><select name="space" defaultValue={e?.space || eventSpaces[0]?.id}>{eventSpaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="f"><span>Date and time (Lagos)</span><input type="datetime-local" name="when" required defaultValue={toLocalInput(e?.starts_at)} /></label>
      </div>
      <label className="f"><span>Title</span><input name="title" required defaultValue={e?.title || ''} /></label>
      <label className="f"><span>Description</span><textarea name="description" defaultValue={e?.description || ''} /></label>
      <div className="fg">
        <label className="f"><span>Length (minutes)</span><input type="number" name="mins" min="5" defaultValue={e?.mins || 60} /></label>
        <label className="f"><span>Host</span><input name="host" defaultValue={e?.host || site.creator.name} /></label>
        <label className="f"><span>Places</span><input type="number" name="seats" min="0" defaultValue={e?.seats ?? 20} /></label>
      </div>
      <div className="fg">
        <label className="f"><span>Fee (0 = free)</span><input type="number" name="price" min="0" step="any" defaultValue={e ? Number(e.price) : 0} /></label>
        <label className="f"><span>Currency</span><select name="currency" defaultValue={e?.currency || 'NGN'}><option value="NGN">Naira (₦)</option><option value="USD">US dollars ($)</option></select></label>
      </div>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div className="row"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save event'}</button>{e && <button type="button" className="btn danger" onClick={del}>Delete</button>}</div>
    </form>
  );
}

/* ---------- Lesson media and eBook files ---------- */
type Media = { lesson_id: string; course_id: string; video_url: string | null; pdf_url: string | null; notes: string | null };
type Book = { id: string; title: string; price: number; currency: string; pdf_url: string | null };

export function MediaTab() {
  const [cid, setCid] = useState(site.courses[0]?.id || '');
  const [view, setView] = useState<'lessons' | 'ebooks'>('lessons');
  return (
    <>
      <nav className="tabs card" aria-label="Media" style={{ margin: 0, padding: '6px 12px 0' }}>
        <a href="#lessons" className={view === 'lessons' ? 'on' : ''} onClick={(e) => { e.preventDefault(); setView('lessons'); }}>🎥 Lesson videos, PDFs and notes</a>
        <a href="#ebooks" className={view === 'ebooks' ? 'on' : ''} onClick={(e) => { e.preventDefault(); setView('ebooks'); }}>📚 eBook files and prices</a>
      </nav>
      {view === 'ebooks' ? <Ebooks /> : (
        <>
          <section className="card">
            <p className="small muted" style={{ margin: '0 0 10px' }}>Paste a video link (YouTube, Vimeo, Google Drive, Bunny, or a video file) and a PDF link for each lesson. Only members who have unlocked the course can open them. Notes appear under the video.</p>
            <select value={cid} onChange={(e) => setCid(e.target.value)} aria-label="Course">{site.tracks.map((t) => <optgroup key={t.id} label={t.title}>{site.courses.filter((c) => c.track === t.id).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</optgroup>)}</select>
          </section>
          <LessonMedia key={cid} cid={cid} />
        </>
      )}
    </>
  );
}

function LessonMedia({ cid }: { cid: string }) {
  const c = site.courses.find((x) => x.id === cid)!;
  const { data, error, reload } = useLoad(() => q<Media[]>(db().from('lesson_media').select('*').eq('course_id', cid)), [cid]);
  const [saved, setSaved] = useState<Record<string, string>>({});
  if (!data) return <Loading error={error} what="lesson media" />;
  const by = Object.fromEntries(data.map((m) => [m.lesson_id, m]));
  const done = flatLessons(c).filter((l) => by[l.id]?.video_url || by[l.id]?.pdf_url).length;
  const save = async (lid: string, form: HTMLFormElement) => {
    const fd = new FormData(form); const g = (k: string) => String(fd.get(k) || '').trim() || null;
    setSaved((s) => ({ ...s, [lid]: 'Saving…' }));
    try { await q(db().from('lesson_media').upsert({ lesson_id: lid, course_id: cid, video_url: g('video'), pdf_url: g('pdf'), notes: g('notes') })); setSaved((s) => ({ ...s, [lid]: '✓ Saved' })); reload(); }
    catch (err) { setSaved((s) => ({ ...s, [lid]: niceError(err) })); }
  };
  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>{c.title}</h2>
      <p className="small muted">{done} of {flatLessons(c).length} lessons have a video or PDF.</p>
      {c.modules.map((m) => (
        <details className="mod" key={m.id}>
          <summary>{m.title}<span className="mmeta">{m.lessons.filter((l) => by[l.id]?.video_url || by[l.id]?.pdf_url).length} of {m.lessons.length} with media</span></summary>
          <div className="stack" style={{ padding: '6px 14px 14px' }}>
            {m.lessons.map((l) => (
              <form key={l.id} className="stack" style={{ gap: 6, borderTop: '1px dashed var(--line)', paddingTop: 10 }} onSubmit={(e) => { e.preventDefault(); save(l.id, e.currentTarget); }}>
                <b>{l.title} <span className="small muted">({l.kind})</span></b>
                <div className="fg">
                  <label className="f"><span>Video link</span><input name="video" defaultValue={by[l.id]?.video_url || ''} placeholder="https://" /></label>
                  <label className="f"><span>PDF link</span><input name="pdf" defaultValue={by[l.id]?.pdf_url || ''} placeholder="https://" /></label>
                </div>
                <label className="f"><span>Notes (optional)</span><textarea name="notes" defaultValue={by[l.id]?.notes || ''} rows={2} /></label>
                <div className="row"><button className="btn quiet sm">Save lesson</button>{saved[l.id] && <span className="small">{saved[l.id]}</span>}</div>
              </form>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}

function Ebooks() {
  const { teamRole } = useAuth();
  const { data, error, reload } = useLoad(() => q<Book[]>(db().from('ebooks').select('id,title,price,currency,pdf_url').order('id')), []);
  const [msg, setMsg] = useState<Record<string, string>>({});
  if (!data) return <Loading error={error} what="eBooks" />;
  const save = async (b: Book, form: HTMLFormElement) => {
    const fd = new FormData(form);
    const patch: Record<string, unknown> = { pdf_url: String(fd.get('pdf') || '').trim() || null };
    if (teamRole === 'admin') patch.price = Number(fd.get('price')) || 0;
    setMsg((m) => ({ ...m, [b.id]: 'Saving…' }));
    try { await q(db().from('ebooks').update(patch).eq('id', b.id)); setMsg((m) => ({ ...m, [b.id]: '✓ Saved' })); reload(); } catch (err) { setMsg((m) => ({ ...m, [b.id]: niceError(err) })); }
  };
  return (
    <section className="card"><h2 style={{ marginTop: 0 }}>eBook files</h2>
      <p className="small muted">Put each eBook's PDF link here (for example a Supabase Storage or Google Drive link). Only members who own the eBook can open it. The price here is what Paystack charges; the price shown on the page comes from the app, so change both together for now.</p>
      {data.map((b) => (
        <form key={b.id} className="dlrow" style={{ flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); save(b, e.currentTarget); }}>
          <b style={{ flex: '1 1 200px' }}>{b.title}</b>
          <input name="pdf" defaultValue={b.pdf_url || ''} placeholder="PDF link" style={{ flex: '2 1 260px', width: 'auto' }} />
          <input name="price" type="number" min="0" defaultValue={Number(b.price)} disabled={teamRole !== 'admin'} style={{ width: 110 }} aria-label="Price in naira" />
          <button className="btn quiet sm">Save</button>{msg[b.id] && <span className="small">{msg[b.id]}</span>}
        </form>
      ))}
    </section>
  );
}

/* ---------- Announcements ---------- */
type Ann = { id: string; title: string; category: string; body: string; important: boolean; pinned: boolean; published_at: string };
export function NewsTab() {
  const { data, error, reload } = useLoad(() => q<Ann[]>(db().from('announcements').select('*').order('published_at', { ascending: false })), []);
  const [edit, setEdit] = useState<Ann | 'new' | null>(null);
  if (!data) return <Loading error={error} what="announcements" />;
  return (
    <>
      <section className="card"><div className="spread"><h2 style={{ margin: 0 }}>Announcements</h2><button className="btn sm" onClick={() => setEdit('new')}>＋ New announcement</button></div>
        <p className="small muted" style={{ margin: '6px 0 0' }}>These appear in the Announcements space for everyone.</p></section>
      {data.map((a) => (
        <article className="card" key={a.id}>
          <div className="spread"><span className="small muted">{a.category} · {day(a.published_at)}{a.pinned ? ' · 📌 pinned' : ''}{a.important ? ' · ❗ important' : ''}</span><button className="btn ghost sm" onClick={() => setEdit(a)}>✎ Edit</button></div>
          <h3 style={{ margin: '6px 0' }}>{a.title}</h3><p className="small" style={{ margin: 0, whiteSpace: 'pre-line' }}>{a.body.slice(0, 280)}{a.body.length > 280 ? '…' : ''}</p>
        </article>
      ))}
      <Dialog open={!!edit} onClose={() => setEdit(null)} wide>{edit && <AnnForm a={edit === 'new' ? null : edit} onDone={() => { setEdit(null); reload(); }} />}</Dialog>
    </>
  );
}

function AnnForm({ a, onDone }: { a: Ann | null; onDone: () => void }) {
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const g = (k: string) => String(fd.get(k) || '').trim();
    const row = { title: g('title'), category: g('category'), body: g('body'), important: fd.get('important') === 'on', pinned: fd.get('pinned') === 'on', published_at: fromLocalInput(g('when')) || new Date().toISOString() };
    setBusy(true); setMsg('');
    try { await q(a ? db().from('announcements').update(row).eq('id', a.id) : db().from('announcements').insert(row)); onDone(); } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };
  const del = async () => { if (!a || !confirm('Delete this announcement?')) return; try { await q(db().from('announcements').delete().eq('id', a.id)); onDone(); } catch (err) { setMsg(niceError(err)); } };
  return (
    <form className="stack" onSubmit={save}>
      <h2>{a ? 'Edit announcement' : 'New announcement'}</h2>
      <label className="f"><span>Title</span><input name="title" required defaultValue={a?.title || ''} /></label>
      <div className="fg">
        <label className="f"><span>Category</span><select name="category" defaultValue={a?.category || site.annCats[0]}>{site.annCats.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="f"><span>Published (Lagos time)</span><input type="datetime-local" name="when" defaultValue={toLocalInput(a?.published_at || new Date().toISOString())} /></label>
      </div>
      <label className="f"><span>Message</span><textarea name="body" required rows={8} defaultValue={a?.body || ''} /></label>
      <div className="row"><label className="row small"><input type="checkbox" name="pinned" defaultChecked={a?.pinned} style={{ width: 'auto' }} /> Pin to the top</label><label className="row small"><input type="checkbox" name="important" defaultChecked={a?.important} style={{ width: 'auto' }} /> Mark as important</label></div>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div className="row"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Publish'}</button>{a && <button type="button" className="btn danger" onClick={del}>Delete</button>}</div>
    </form>
  );
}

/* ---------- Team ---------- */
type Adm = { email: string; role: 'admin' | 'editor'; added_at: string };
export function TeamTab() {
  const { session } = useAuth();
  const me = (session?.user.email || '').toLowerCase();
  const { data, error, reload } = useLoad(() => q<Adm[]>(db().from('app_admins').select('*').order('added_at')), []);
  const [msg, setMsg] = useState('');
  if (!data) return <Loading error={error} what="the team" />;
  const run = async (f: () => PromiseLike<unknown>) => { setMsg(''); try { await q(f() as PromiseLike<{ data: unknown; error: { message: string } | null }>); reload(); } catch (err) { setMsg(niceError(err)); } };
  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setMsg('Enter a valid email.');
    run(() => db().from('app_admins').insert({ email, role: String(fd.get('role')) }));
    e.currentTarget.reset();
  };
  return (
    <section className="card"><h2 style={{ marginTop: 0 }}>Team</h2>
      <p className="small muted"><b>Admins</b> can do everything here. <b>Editors</b> can manage events, lesson media, eBook files and announcements, and post in the Faculty Lounge, but can't see members, money or applications. A new team member signs up on the site with the same email, then signs in.</p>
      {data.map((a) => (
        <div className="dlrow" key={a.email}>
          <span style={{ flex: 1 }}><b>{a.email}</b>{a.email.toLowerCase() === me && <span className="badge" style={{ marginLeft: 6 }}>You</span>}<br /><span className="small muted">added {day(a.added_at)}</span></span>
          <select value={a.role} disabled={a.email.toLowerCase() === me} onChange={(e) => run(() => db().from('app_admins').update({ role: e.target.value }).eq('email', a.email))} style={{ width: 'auto' }}><option value="admin">Admin</option><option value="editor">Editor</option></select>
          {a.email.toLowerCase() !== me && <button className="btn ghost sm" onClick={() => { if (confirm('Remove ' + a.email + ' from the team?')) run(() => db().from('app_admins').delete().eq('email', a.email)); }}>Remove</button>}
        </div>
      ))}
      <form className="row" style={{ marginTop: 12 }} onSubmit={add}>
        <input name="email" type="email" placeholder="team member's email" required style={{ flex: '1 1 240px', width: 'auto' }} />
        <select name="role" style={{ width: 'auto' }}><option value="editor">Editor</option><option value="admin">Admin</option></select>
        <button className="btn sm">Add to team</button>
      </form>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
    </section>
  );
}
