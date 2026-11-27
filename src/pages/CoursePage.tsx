import { useEffect, useState, type FormEvent } from 'react';
import type { Module } from '../data/types';
import { Link, useParams } from 'react-router-dom';
import { cm, courseById, flatLessons, site, trackById } from '../data/site';
import type { Course, Lesson } from '../data/types';
import { niceError, useAuth } from '../lib/auth';
import {
  completeLesson, embedUrl, myPendingRequests, paystackKey, payWithPaystack, pdfSrc, sendPaymentRequest,
  startFreeCourse, useCourseState, useLessonMedia, type Enrollment,
} from '../lib/learning';
import { useModals } from '../components/Modals';

const hasAccess = (e: Enrollment | null) => !!e && (e.plan === 'free' || e.plan === 'granted' || e.amount_paid > 0);
const priceText = (c: Course) =>
  c.mode === 'application' ? 'By application' : c.mode === 'free' ? 'Free' :
  cm(c, c.price) + (c.instN > 1 ? ` or ${c.instN} × ${cm(c, c.instAmt)}` : '');

/* ---------- Full-width course banner (shown above the page layout) ---------- */
export function CourseBanner({ id }: { id: string }) {
  const c = courseById(id);
  if (!c) return null;
  const sp = site.spaces.find((s) => s.id === c.space), tr = trackById(c.track), n = flatLessons(c).length;
  const trackNo = tr ? site.tracks.indexOf(tr) + 1 : 0;
  return (
    <section className="cbf" aria-label="Course banner">
      <div className="in">
        <nav className="small crumbs" aria-label="Breadcrumb">
          <Link to={'/space/' + c.space}>{sp?.name || 'Courses'}</Link> ›{' '}
          {tr && <><Link to={'/track/' + tr.id}>Track {trackNo}: {tr.title}</Link> › </>}
          <b style={{ color: '#fff' }}>{c.title}</b>
        </nav>
        <div style={{ marginTop: 14 }}><span className="badge lemon">{tr ? tr.title : 'Course'}</span></div>
        <h1>{c.headline || c.title}</h1>
        {c.sub && <p style={{ margin: 0 }}>{c.sub}</p>}
        <div className="meta">
          <span>{c.modules.length} modules</span><span>{n} lessons</span><span>{priceText(c)}</span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Course page: access box, current lesson, outline, downloads ---------- */
export function CoursePage() {
  const { id = '', lessonId } = useParams();
  const c = courseById(id);
  const st = useCourseState(id);
  if (!c) return <div className="card empty">Course not found. <Link to="/space/courses">See all courses</Link></div>;

  const flat = flatLessons(c);
  const access = hasAccess(st.enrollment);
  const isOpen = (l: Lesson) => { const i = flat.indexOf(l); return access && (i === 0 || st.done.has(flat[i - 1].id)); };
  const pct = flat.length ? Math.round((flat.filter((l) => st.done.has(l.id)).length * 100) / flat.length) : 0;
  const lesson = lessonId ? flat.find((l) => l.id === lessonId) : undefined;
  const nextUp = flat.find((l) => !st.done.has(l.id));

  return (
    <>
      <AccessBox c={c} st={st} access={access} nextUp={nextUp} />
      {lesson && <LessonView c={c} lesson={lesson} open={isOpen(lesson)} access={access} done={st.done.has(lesson.id)} flat={flat} onDone={st.refresh} />}
      {!lesson && c.desc && (
        <section className="card"><h2>About this course</h2>{c.desc.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}</section>
      )}
      <section className="card">
        <div className="spread"><h2 style={{ margin: 0 }}>Course content</h2>{access && <span className="small muted">{pct}% complete</span>}</div>
        {access && <div className="progress" style={{ margin: '10px 0 14px' }}><span style={{ width: pct + '%' }} /></div>}
        <Outline c={c} lessonId={lessonId} isOpen={isOpen} done={st.done} />
        {access && pct === 100 && (
          <div className="notice" style={{ marginTop: 14 }}>
            🎉 You completed every lesson.{st.enrollment && st.enrollment.amount_paid < st.enrollment.amount_due ? ' Your certificate is ready once all installments are paid.' : ' Well done!'}
          </div>
        )}
      </section>
      {c.downloads.length > 0 && (
        <section className="card">
          <h2>Downloads</h2>
          {c.downloads.map((d) => (
            <div key={d} className="dlrow"><span>📎 {d.split('|')[0]}</span><span className="small muted" style={{ marginLeft: 'auto' }}>{access ? 'Shared inside the lessons' : '🔒 Unlocks with the course'}</span></div>
          ))}
        </section>
      )}
    </>
  );
}

/* ---------- How to get in: sign in, start free, pay, or apply ---------- */
function AccessBox({ c, st, access, nextUp }: { c: Course; st: ReturnType<typeof useCourseState>; access: boolean; nextUp?: Lesson }) {
  const { session, profile } = useAuth();
  const { openAccount } = useModals();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [plan, setPlan] = useState<'full' | 'inst'>('full');
  const [manual, setManual] = useState(false);
  const [pending, setPending] = useState<{ amount: number; method: string }[]>([]);
  const e = st.enrollment;

  useEffect(() => {
    if (session && c.mode === 'paid') myPendingRequests(c.id).then((r) => setPending(r as { amount: number; method: string }[]));
  }, [session, c.id, c.mode]);

  if (st.loading && session) return <section className="card"><p className="muted" style={{ margin: 0 }}>Checking your access…</p></section>;

  const continueLink = nextUp && <Link className="btn lemon" to={`/course/${c.id}/${nextUp.id}`}>{st.done.size ? 'Continue: ' : 'Start: '}{nextUp.title} →</Link>;

  // Already in
  if (access && e) {
    const owed = e.amount_due - e.amount_paid;
    return (
      <section className="card enrolbox">
        <div className="spread">
          <div><span className="badge">✓ {e.plan === 'free' ? 'Enrolled' : e.plan === 'granted' ? 'Place confirmed' : 'Unlocked'}</span>
            {e.plan === 'installments' && <p className="small muted" style={{ margin: '6px 0 0' }}>Paid {cm(c, e.amount_paid)} of {cm(c, e.amount_due)}{owed > 0 ? ` · next installment ${cm(c, Math.min(c.instAmt, owed))}` : ' · fully paid'}</p>}
          </div>
          {continueLink}
        </div>
        {e.plan === 'installments' && owed > 0 && (
          <PayOptions c={c} amount={Math.min(c.instAmt, owed)} label="Pay next installment" busy={busy} setBusy={setBusy} setMsg={setMsg}
            email={profile?.email || session?.user.email || ''} userId={session!.user.id} onPaid={st.refresh} manual={manual} setManual={setManual} />
        )}
        {msg && <p className="formmsg" role="alert">{msg}</p>}
      </section>
    );
  }

  if (c.mode === 'application') {
    const sp = c.amld === 'sprint' ? 'amld' : 'presence';
    return (
      <section className="card enrolbox">
        <h2 style={{ margin: 0 }}>Places on this course are by application</h2>
        <p style={{ margin: '6px 0 12px' }}>It is part of an advanced programme. Once your application is accepted, the course opens here for you.</p>
        <Link className="btn" to={'/space/' + sp}>Learn about the programme and apply</Link>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="card enrolbox">
        <h2 style={{ margin: 0 }}>{c.mode === 'free' ? 'This course is free' : priceText(c)}</h2>
        <p style={{ margin: '6px 0 12px' }}>{c.mode === 'free' ? 'Create a free account or sign in to start learning.' : 'Create a free account or sign in, then unlock the course to open every lesson.'}</p>
        <div className="row"><button className="btn lemon" onClick={() => openAccount('up')}>Create a free account</button><button className="btn quiet" onClick={() => openAccount('in')}>Sign in</button></div>
      </section>
    );
  }

  if (c.mode === 'free') {
    return (
      <section className="card enrolbox">
        <h2 style={{ margin: 0 }}>This course is free</h2>
        <p style={{ margin: '6px 0 12px' }}>Start whenever you are ready. Your progress is saved to your account.</p>
        <button className="btn lemon" disabled={busy} onClick={async () => {
          setBusy(true); setMsg('');
          try { await startFreeCourse(c.id); await st.refresh(); } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
        }}>{busy ? 'Starting…' : 'Start this course'}</button>
        {msg && <p className="formmsg" role="alert" style={{ marginTop: 10 }}>{msg}</p>}
      </section>
    );
  }

  // Paid and not yet unlocked
  const amount = plan === 'inst' && c.instN > 1 ? c.instAmt : c.price;
  return (
    <section className="card enrolbox">
      <h2 style={{ margin: 0 }}>Unlock this course</h2>
      <p style={{ margin: '6px 0 12px' }}>Unlocking opens every lesson, the downloads and your certificate.</p>
      {c.instN > 1 && (
        <div className="stack" role="radiogroup" aria-label="How would you like to pay?" style={{ gap: 6, marginBottom: 12 }}>
          <label className="row"><input type="radio" name="plan" checked={plan === 'full'} onChange={() => setPlan('full')} style={{ width: 'auto' }} /> Pay in full: <b>{cm(c, c.price)}</b></label>
          <label className="row"><input type="radio" name="plan" checked={plan === 'inst'} onChange={() => setPlan('inst')} style={{ width: 'auto' }} /> {c.instN} installments of <b>{cm(c, c.instAmt)}</b> (total {cm(c, c.instN * c.instAmt)}). The course opens after the first.</label>
        </div>
      )}
      {pending.length > 0 && <div className="notice" style={{ marginBottom: 12 }}>⏳ We received your {pending[0].method.toLowerCase()} notice for {cm(c, pending[0].amount)}. The course opens as soon as we confirm it, usually within one working day.</div>}
      <PayOptions c={c} amount={amount} label={'Pay ' + cm(c, amount)} busy={busy} setBusy={setBusy} setMsg={setMsg}
        email={profile?.email || session.user.email || ''} userId={session.user.id} onPaid={st.refresh} manual={manual} setManual={setManual}
        onRequested={() => myPendingRequests(c.id).then((r) => setPending(r as { amount: number; method: string }[]))} />
      {msg && <p className="formmsg" role="alert" style={{ marginTop: 10 }}>{msg}</p>}
    </section>
  );
}

function PayOptions(p: {
  c: Course; amount: number; label: string; busy: boolean; setBusy: (b: boolean) => void; setMsg: (m: string) => void;
  email: string; userId: string; onPaid: () => void; manual: boolean; setManual: (b: boolean) => void; onRequested?: () => void;
}) {
  const pay = site.payments;
  const [sent, setSent] = useState(false);

  const card = async () => {
    p.setBusy(true); p.setMsg('');
    try {
      const r = await payWithPaystack({ courseId: p.c.id, courseTitle: p.c.title, amount: p.amount, currency: p.c.currency, email: p.email, userId: p.userId });
      if (r === 'paid') p.onPaid(); else p.setMsg('Payment window closed. You have not been charged.');
    } catch (err) { p.setMsg(niceError(err)); } finally { p.setBusy(false); }
  };

  const request = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    p.setBusy(true); p.setMsg('');
    try {
      await sendPaymentRequest({
        course_id: p.c.id, currency: p.c.currency, method: (fd.get('method') as 'Bank transfer' | 'LinPay') || 'Bank transfer', amount: p.amount,
        reference: String(fd.get('reference') || '').trim(), note: String(fd.get('note') || '').trim(),
      });
      setSent(true); p.onRequested?.();
    } catch (err) { p.setMsg(niceError(err)); } finally { p.setBusy(false); }
  };

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row">
        {paystackKey && <button className="btn lemon" disabled={p.busy} onClick={card}>{p.busy ? 'Please wait…' : `🔒 ${p.label} with card, bank or USSD`}</button>}
        <button className={'btn ' + (paystackKey ? 'quiet' : 'lemon')} onClick={() => p.setManual(!p.manual)} aria-expanded={p.manual}>
          {paystackKey ? 'Pay by bank transfer or LinPay' : `${p.label} by bank transfer or LinPay`}
        </button>
      </div>
      {p.manual && (sent ? (
        <div className="notice">Thank you. We’ll check your payment and open the course, usually within one working day. You’ll see it unlocked here.</div>
      ) : (
        <form className="stack paybox" onSubmit={request}>
          <p className="small" style={{ margin: 0 }}>
            <b>1.</b> Send <b>{cm(p.c, p.amount)}</b>{' '}
            {pay.accountNumber ? <>to <b>{pay.accountName}</b>, {pay.bankName}, account <b>{pay.accountNumber}</b></> : <>using the bank details we share on request (<Link to="/space/contact">contact us</Link>)</>}
            {pay.linpayUrl && <>, or pay through <a href={pay.linpayUrl} target="_blank" rel="noopener">LinPay ↗</a></>}.
            {' '}<b>2.</b> Tell us below, and we’ll unlock the course once we see it.
          </p>
          <div className="fg">
            <label className="f"><span>How did you pay?</span><select name="method"><option>Bank transfer</option><option>LinPay</option></select></label>
            <label className="f"><span>Payment reference or sender name</span><input name="reference" maxLength={120} placeholder="e.g. GTB transfer from Ada Eze" /></label>
          </div>
          <label className="f"><span>Anything we should know? (optional)</span><input name="note" maxLength={1000} /></label>
          <div><button className="btn" disabled={p.busy}>{p.busy ? 'Sending…' : 'I have paid'}</button></div>
        </form>
      ))}
    </div>
  );
}

/* ---------- One lesson ---------- */
function LessonView({ c, lesson, open, access, done, flat, onDone }: { c: Course; lesson: Lesson; open: boolean; access: boolean; done: boolean; flat: Lesson[]; onDone: () => void }) {
  const { media, loading } = useLessonMedia(lesson.id, open);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const i = flat.indexOf(lesson), next = flat[i + 1];

  const finish = async (answer?: string) => {
    setBusy(true); setMsg('');
    try { await completeLesson(c.id, lesson.id, answer); onDone(); } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };

  let body;
  if (!access) body = <div className="notice">🔒 This lesson opens once you have unlocked the course.</div>;
  else if (!open) body = <div className="notice">This lesson opens when you complete the one before it.</div>;
  else if (loading) body = <p className="muted">Loading the lesson…</p>;
  else {
    const v = embedUrl(media?.video_url || '');
    const video = lesson.kind === 'video' && (
      v.kind === 'iframe' ? <div className="player emb"><iframe src={v.src} title={lesson.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>
      : v.kind === 'file' ? <div className="player emb"><video controls preload="metadata" controlsList="nodownload" playsInline src={v.src} /></div>
      : v.kind === 'link' ? <div className="player"><div><div className="pl">▶</div><a className="btn lemon sm" href={v.src} target="_blank" rel="noopener">Open the video ↗</a></div></div>
      : <div className="player"><div><div className="pl">▶</div><p style={{ margin: 0 }}>The video for this lesson is being added. Check back soon.</p></div></div>
    );
    const pdf = media?.pdf_url ? (
      <div className="pdfwrap" style={{ marginTop: 12 }}>
        <iframe className="pdfv" src={pdfSrc(media.pdf_url)} title={'Document: ' + lesson.title} loading="lazy" />
        <div className="row" style={{ marginTop: 8 }}><a className="btn quiet sm" href={media.pdf_url} target="_blank" rel="noopener" download>⬇ Download PDF</a></div>
      </div>
    ) : lesson.kind === 'pdf' ? <div className="notice">📄 The document for this lesson is being added. Check back soon.</div> : null;
    body = (
      <>
        {video}{pdf}
        {media?.notes && <div className="lnotes" style={{ marginTop: 12 }}>{media.notes.split('\n\n').map((p, k) => <p key={k}>{p}</p>)}</div>}
        {lesson.kind === 'quiz' && !done && (
          <form className="stack" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); const a = String(new FormData(e.currentTarget).get('a') || '').trim(); if (a.length < 10) return setMsg('Please write two or three sentences.'); finish(a); }}>
            <label className="f"><span>Reflection: in two or three sentences, what will you do differently after this module?</span><textarea name="a" required maxLength={4000} rows={4} /></label>
            <div><button className="btn sm" disabled={busy}>{busy ? 'Saving…' : 'Submit and complete'}</button></div>
          </form>
        )}
      </>
    );
  }

  return (
    <div className="card" id="lesson">
      <span className="small muted">Lesson {i + 1} of {flat.length}</span>
      <h2>{lesson.title}</h2>
      {lesson.sum && <div className="lcov"><b>What this lesson covers</b><span>{lesson.sum}</span></div>}
      {body}
      {msg && <p className="formmsg" role="alert" style={{ marginTop: 10 }}>{msg}</p>}
      {open && (
        <div className="spread" style={{ marginTop: 14 }}>
          {done ? <span className="badge">✓ Completed</span> : lesson.kind !== 'quiz' ? <button className="btn sm" disabled={busy} onClick={() => finish()}>{busy ? 'Saving…' : 'Mark lesson complete'}</button> : <span />}
          {next && done && <Link className="btn quiet sm" to={`/course/${c.id}/${next.id}`}>Next: {next.title} →</Link>}
        </div>
      )}
    </div>
  );
}

/* ---------- Course outline: parts, module notes, collapsible modules and lesson summaries ---------- */
function Outline({ c, lessonId, isOpen, done }: { c: Course; lessonId?: string; isOpen: (l: Lesson) => boolean; done: Set<string> }) {
  const flat = flatLessons(c);
  const long = c.modules.length > 3 || flat.length > 18, sums = flat.some((l) => l.sum);
  const focus = lessonId || flat.find((l) => !done.has(l.id))?.id || '';
  const focusMi = Math.max(0, c.modules.findIndex((m) => m.lessons.some((l) => l.id === focus)));
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [ex, setEx] = useState<Record<string, boolean>>({});
  const [allSums, setAllSums] = useState(false);
  const isMod = (m: Module, mi: number) => m.lessons.some((l) => l.id === lessonId) || (m.id in open ? open[m.id] : (!long || mi === focusMi));
  let lastPart = '';
  return (
    <>
      {(long || sums) && (
        <div className="ctools">
          <span className="small muted">{c.modules.length} modules · {flat.length} lessons</span>
          {long && <><button className="btn ghost sm" onClick={() => setOpen(Object.fromEntries(c.modules.map((m) => [m.id, true])))}>⊞ Expand all</button>
            <button className="btn ghost sm" onClick={() => setOpen(Object.fromEntries(c.modules.map((m) => [m.id, false])))}>⊟ Collapse all</button></>}
          {sums && <button className="btn ghost sm" aria-pressed={allSums} onClick={() => { setAllSums(!allSums); setEx({}); }}>☰ {allSums ? 'Hide' : 'Show'} lesson summaries</button>}
        </div>
      )}
      {c.modules.map((m, mi) => {
        let head = null;
        if (m.part && m.part !== lastPart) {
          lastPart = m.part;
          const p = (c.parts || []).find((x) => x.id === m.part);
          head = <div className="mpart"><b>{p ? p.title : m.part}</b>{p?.desc && <p>{p.desc}</p>}</div>;
        }
        const meta = [`${m.lessons.length} lesson${m.lessons.length === 1 ? '' : 's'}`, m.worksheet && 'worksheet', m.deliverable && 'deliverable'].filter(Boolean).join(' · ');
        const info = m.about || m.outcome || m.worksheet || m.deliverable;
        return (
          <div key={m.id}>
            {head}
            <details className="mod" open={isMod(m, mi)} onToggle={(e) => { const v = (e.currentTarget as HTMLDetailsElement).open; if (v !== isMod(m, mi)) setOpen((o) => ({ ...o, [m.id]: v })); }}>
              <summary><span>{m.title}</span><span className="mmeta">{meta}</span></summary>
              {info && (
                <div className="minfo">
                  {m.about && <p><i>{m.about}</i></p>}
                  {m.outcome && <p><b>By the end:</b> {m.outcome}</p>}
                  {m.worksheet && <p><b>📝 Worksheet:</b> {m.worksheet}</p>}
                  {m.deliverable && <p><b>🎯 Deliverable:</b> {m.deliverable}</p>}
                </div>
              )}
              {m.lessons.map((l) => {
                const i = flat.indexOf(l), op = isOpen(l), ok = done.has(l.id);
                const inner = <><span className={'st' + (ok ? ' ok' : '')}>{ok ? '✓' : op ? i + 1 : '🔒'}</span>{l.title}<span className="k">{l.kind}{l.mins ? ' · ' + l.mins + ' min' : ''}</span></>;
                const row = op
                  ? <Link className={'les' + (l.id === lessonId ? ' cur' : '')} to={`/course/${c.id}/${l.id}`}>{inner}</Link>
                  : <div className="les locked">{inner}</div>;
                if (!l.sum) return <div key={l.id}>{row}</div>;
                const shown = l.id in ex ? ex[l.id] : allSums;
                return (
                  <div className={'lw' + (shown ? ' ex' : '')} key={l.id}>
                    <div className="lrow">{row}<button className="lx" aria-expanded={shown} aria-label={`What “${l.title}” covers`} title="What this lesson covers" onClick={() => setEx((x) => ({ ...x, [l.id]: !shown }))}><span aria-hidden="true">▾</span></button></div>
                    <p className="lsum">{l.sum}</p>
                  </div>
                );
              })}
            </details>
          </div>
        );
      })}
    </>
  );
}
