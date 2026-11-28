// Discussion feeds: Community, Introduce yourself, Portfolio Showcase, Faculty Lounge and the Critique Wall.
import { useState, type FormEvent } from 'react';
import type { Space } from '../../data/types';
import { site } from '../../data/site';
import { niceError, useAuth } from '../../lib/auth';
import { addComment, ago, createPost, deleteComment, deletePost, setPinned, toggleLike, usePosts, type Post } from '../../lib/community';
import { useModals } from '../../components/Modals';
import { Avatar, SpaceHead } from '../../components/Kit';

/** Composer and feed for one space. */
export function Feed({ space, placeholder, template }: { space: string; placeholder: string; template?: string }) {
  const { session, profile } = useAuth();
  const { openAccount } = useModals();
  const { posts, loading, error, refresh } = usePosts(space);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const post = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return setMsg('Write something first.');
    setBusy(true); setMsg('');
    try { await createPost(space, text.trim()); setText(''); await refresh(); } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };

  return (
    <>
      {template && session && <div style={{ margin: '-6px 0 12px' }}><button className="btn quiet sm" onClick={() => setText(template)}>Fill in the template for me</button></div>}
      {session ? (
        <form className="card" onSubmit={post}>
          <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <Avatar name={profile?.name || 'Me'} />
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label="Write a post" maxLength={5000} />
          </div>
          {msg && <p className="formmsg" role="alert">{msg}</p>}
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}><button className="btn sm" disabled={busy}>{busy ? 'Posting…' : 'Post'}</button></div>
        </form>
      ) : (
        <div className="card spread"><span className="muted">Join the community to post here.</span><button className="btn sm" onClick={() => openAccount('up')}>Join free</button></div>
      )}
      {loading ? <div className="card empty">Loading posts…</div>
        : error ? <div className="card empty">We could not load the posts. {error}</div>
        : !posts.length ? <div className="card empty">No posts yet. Be the first!</div>
        : posts.map((p) => <PostCard key={p.id} p={p} onChange={refresh} />)}
    </>
  );
}

function PostCard({ p, onChange }: { p: Post; onChange: () => void }) {
  const { session, teamRole } = useAuth();
  const uid = session?.user.id;
  const team = !!teamRole;
  const [reply, setReply] = useState('');
  const [msg, setMsg] = useState('');
  const name = p.is_creator ? site.creator.name : p.author_name;
  const run = async (f: () => Promise<void>) => { setMsg(''); try { await f(); onChange(); } catch (err) { setMsg(niceError(err)); } };

  return (
    <article className="card post">
      <header>
        <Avatar name={name} size={40} creator={p.is_creator} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{name}</b>{p.is_creator && <> <span className="badge lemon">Creator</span></>}
          <div className="small muted">{ago(p.created_at)}{p.pinned ? ' · 📌 Pinned' : ''}</div>
        </div>
        {team && <button className="btn ghost sm" onClick={() => run(() => setPinned(p.id, !p.pinned))}>{p.pinned ? 'Unpin' : 'Pin'}</button>}
        {(team || (uid && p.user_id === uid)) && (
          <button className="btn ghost sm" aria-label="Delete post" onClick={() => { if (confirm('Delete this post?')) run(() => deletePost(p.id)); }}>🗑</button>
        )}
      </header>
      <p style={{ whiteSpace: 'pre-line' }}>{p.body}</p>
      <footer>
        <button className="btn ghost sm" aria-pressed={p.liked} style={p.liked ? { color: 'var(--red)' } : undefined}
          onClick={() => (uid ? run(() => toggleLike(p.id, p.liked)) : setMsg('Sign in to like posts.'))}>{p.liked ? '♥' : '♡'} {p.likes}</button>
        <span className="btn ghost sm" style={{ cursor: 'default' }}>💬 {p.comments.length}</span>
      </footer>
      {(p.comments.length > 0 || uid) && (
        <div className="comments">
          {p.comments.map((c) => {
            const cn = c.is_creator ? site.creator.name : c.author_name;
            return (
              <div className="cmt" key={c.id}>
                <Avatar name={cn} size={28} creator={c.is_creator} />
                <div className="b"><b>{cn}</b> <span className="small muted">{ago(c.created_at)}</span><div style={{ whiteSpace: 'pre-line' }}>{c.body}</div></div>
                {(team || (uid && c.user_id === uid)) && <button className="btn ghost sm" aria-label="Delete comment" onClick={() => run(() => deleteComment(c.id))}>🗑</button>}
              </div>
            );
          })}
          {uid && (
            <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); if (reply.trim()) run(async () => { await addComment(p.id, reply.trim()); setReply(''); }); }}>
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a comment…" aria-label="Write a comment" maxLength={2000} />
              <button className="btn quiet sm">Reply</button>
            </form>
          )}
        </div>
      )}
      {msg && <p className="formmsg" role="alert">{msg}</p>}
    </article>
  );
}

const INTRO_TEMPLATE = `Hi everyone! I'm [name] from [city].
Right now I'm [what you do].
I'm building / dreaming of [your business].
From this community I hope to [what you want].
Fun fact: [something about you].`;

export function IntroPage({ s }: { s: Space }) {
  return (
    <>
      <SpaceHead s={s} />
      <div className="card guide">
        <h3>How to introduce yourself</h3>
        <p className="small" style={{ margin: 0 }}>Keep it short and friendly; four to six lines is perfect. Try to cover:</p>
        <ol className="small"><li>Your name and where you're based</li><li>What you do now (job, business or studies)</li><li>The business you're building or dreaming about</li><li>What you hope to get from this community</li><li>One fun fact about you</li></ol>
        <p className="small" style={{ margin: '0 0 8px' }}>Joining AMLD or Executive Presence? Introduce yourself here once. Your programme space will ask you something different.</p>
      </div>
      <Feed space={s.id} placeholder="Introduce yourself to the community…" template={INTRO_TEMPLATE} />
    </>
  );
}

export function PostSpacePage({ s }: { s: Space }) {
  const { teamRole } = useAuth();
  if (s.id === 'faculty' && !teamRole) {
    return (
      <>
        <SpaceHead s={s} />
        <div className="card notice"><b>🔒 The Faculty Lounge is private to faculty and the Programme Director.</b> <span className="small">Faculty members see it after a team sign-in.</span></div>
      </>
    );
  }
  return (
    <>
      <SpaceHead s={s} />
      <Feed space={s.id} placeholder={`Share something in ${s.name}…`} />
    </>
  );
}
