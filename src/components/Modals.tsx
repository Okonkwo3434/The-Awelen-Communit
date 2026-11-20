import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { firstName, niceError, useAuth } from '../lib/auth';
import { exitSnoozed, logReturnVisit, okEmail, registerVisitor, rememberVisitor, rememberedVisitor, snoozeExit } from '../lib/visitor';

type View =
  | { kind: 'account'; tab: 'up' | 'in' }
  | { kind: 'exit' }
  | { kind: 'thanks'; name: string; again: boolean }
  | { kind: 'confirm'; email: string };

const Ctx = createContext<{ openAccount: (tab?: 'up' | 'in') => void } | null>(null);
export const useModals = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useModals must be used inside ModalProvider');
  return v;
};

export function ModalProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const { session, profile } = useAuth();
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (view && !d.open) d.showModal();
    if (!view && d.open) d.close();
  }, [view]);

  const close = useCallback(() => {
    // Closing the exit form without sending it: don't ask again for 3 days.
    if (viewRef.current?.kind === 'exit') snoozeExit(3);
    setView(null);
  }, []);

  const openAccount = useCallback((tab: 'up' | 'in' = 'up') => setView({ kind: 'account', tab }), []);

  // Exit prompt: desktop = mouse leaves through the top of the window; phones = after a minute or the 4th page.
  const signedIn = !!session;
  const memberName = profile?.name;
  useEffect(() => {
    logReturnVisit();
    const start = Date.now();
    const show = () => {
      if (dlg.current?.open) return;
      try { if (sessionStorage.getItem('awelen-exit-done')) return; sessionStorage.setItem('awelen-exit-done', '1'); } catch { return; }
      const v = rememberedVisitor();
      if (v || signedIn) return setView({ kind: 'thanks', name: v?.name || memberName || '', again: true });
      if (exitSnoozed()) return;
      setView({ kind: 'exit' });
    };
    const onOut = (e: MouseEvent) => { if (!e.relatedTarget && e.clientY <= 0 && Date.now() - start > 8000) show(); };
    document.addEventListener('mouseout', onOut);
    let timer = 0, pages = 0;
    const onNav = () => { if (++pages === 4) window.setTimeout(show, 1500); };
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse) { timer = window.setTimeout(show, 60000); window.addEventListener('popstate', onNav); window.addEventListener('awelen:navigate', onNav); }
    return () => { document.removeEventListener('mouseout', onOut); clearTimeout(timer); window.removeEventListener('popstate', onNav); window.removeEventListener('awelen:navigate', onNav); };
  }, [signedIn, memberName]);

  return (
    <Ctx.Provider value={{ openAccount }}>
      {children}
      <dialog ref={dlg} onCancel={(e) => { e.preventDefault(); close(); }} onClick={(e) => { if (e.target === dlg.current) close(); }} aria-label="Awelen Entrepreneurs">
        {view && (
          <div className="dc">
            <button className="x" onClick={close} aria-label="Close">×</button>
            {view.kind === 'account' && <AccountForms tab={view.tab} setTab={(tab) => setView({ kind: 'account', tab })} onDone={close} onConfirm={(email) => setView({ kind: 'confirm', email })} />}
            {view.kind === 'exit' && <ExitForm onSent={(name, again) => setView({ kind: 'thanks', name, again })} onSkip={close} onSignIn={() => openAccount('in')} />}
            {view.kind === 'thanks' && <Thanks name={view.name} again={view.again} signedIn={signedIn} onClose={close} onJoin={() => openAccount('up')} />}
            {view.kind === 'confirm' && (
              <div className="stack">
                <h2 style={{ margin: 0 }}>Check your email</h2>
                <p style={{ margin: 0 }}>We sent a confirmation link to <b>{view.email}</b>. Open it to finish creating your account. It signs you in and brings you back here.</p>
                <div><button className="btn quiet" onClick={close}>OK</button></div>
              </div>
            )}
          </div>
        )}
      </dialog>
    </Ctx.Provider>
  );
}

function Busy({ busy, label, busyLabel, cls = 'btn' }: { busy: boolean; label: string; busyLabel: string; cls?: string }) {
  return <button className={cls} disabled={busy}>{busy ? busyLabel : label}</button>;
}

function AccountForms({ tab, setTab, onDone, onConfirm }: { tab: 'up' | 'in'; setTab: (t: 'up' | 'in') => void; onDone: () => void; onConfirm: (email: string) => void }) {
  const { signUp, signIn, sendReset } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  const up = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) || '').trim();
    const a = { name: g('name'), email: g('email').toLowerCase(), phone: g('phone'), password: String(fd.get('password') || '') };
    if (!a.name || !okEmail(a.email) || a.password.length < 8) return setMsg('Please fill in your name, a valid email and a password of 8 or more characters.');
    setBusy(true); setMsg('');
    try {
      const r = await signUp(a);
      rememberVisitor({ name: a.name, email: a.email, phone: a.phone, interest: 'Member', t: Date.now() });
      if (r === 'confirm-email') onConfirm(a.email); else onDone();
    } catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };

  const signin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setMsg('');
    try { await signIn(String(fd.get('email') || '').trim().toLowerCase(), String(fd.get('password') || '')); onDone(); }
    catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };

  const forgot = async () => {
    const email = (emailRef.current?.value || '').trim();
    if (!okEmail(email)) return setMsg('Type your email above first, then press "Forgot password?".');
    try { await sendReset(email); setMsg(`We sent a password reset link to ${email}.`); } catch (err) { setMsg(niceError(err)); }
  };

  const T = (k: 'up' | 'in', l: string) => (
    <button type="button" className={tab === k ? 'on' : ''} aria-pressed={tab === k} onClick={() => { setMsg(''); setTab(k); }}>{l}</button>
  );

  return (
    <div className="acct">
      <div className="atabs">{T('up', 'Create account')}{T('in', 'Sign in')}</div>
      {tab === 'up' ? (
        <form className="stack" onSubmit={up}>
          <h2 style={{ margin: 0 }}>Join Awelen Entrepreneurs</h2>
          <p className="muted small" style={{ margin: 0 }}>Free to join. Members post in the community, book sessions and unlock courses.</p>
          <div className="fg">
            <label className="f"><span>Full name</span><input name="name" required autoComplete="name" /></label>
            <label className="f"><span>Email</span><input type="email" name="email" required autoComplete="email" /></label>
            <label className="f"><span>Phone or WhatsApp (optional)</span><input name="phone" autoComplete="tel" /></label>
            <label className="f"><span>Create a password</span><input type="password" name="password" required minLength={8} autoComplete="new-password" /><small>At least 8 characters.</small></label>
          </div>
          {msg && <p className="formmsg" role="alert">{msg}</p>}
          <div><Busy busy={busy} cls="btn lemon" label="Create my account" busyLabel="Creating your account…" /></div>
        </form>
      ) : (
        <form className="stack" onSubmit={signin}>
          <h2 style={{ margin: 0 }}>Welcome back</h2>
          <p className="muted small" style={{ margin: 0 }}>Sign in to continue learning where you stopped.</p>
          <div className="fg">
            <label className="f"><span>Email</span><input ref={emailRef} type="email" name="email" required autoComplete="username" /></label>
            <label className="f"><span>Password</span><input type="password" name="password" required autoComplete="current-password" /></label>
          </div>
          {msg && <p className="formmsg" role="alert">{msg}</p>}
          <div className="row"><Busy busy={busy} label="Sign in" busyLabel="Signing in…" /><button type="button" className="btn quiet sm" onClick={forgot}>Forgot password?</button></div>
        </form>
      )}
    </div>
  );
}

function ExitForm({ onSent, onSkip, onSignIn }: { onSent: (name: string, again: boolean) => void; onSkip: () => void; onSignIn: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const mob = window.matchMedia('(pointer: coarse)').matches;
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) || '').trim();
    const v = { name: g('name'), email: g('email').toLowerCase(), phone: g('phone'), interest: g('interest'), t: Date.now() };
    if (!v.name || !okEmail(v.email)) return setMsg('Please enter your name and a valid email.');
    setBusy(true);
    const res = await registerVisitor(v);
    rememberVisitor(v);
    setBusy(false);
    onSent(v.name, res === 'returning');
  };
  return (
    <form className="stack exitf" onSubmit={submit}>
      <span className="kick">{mob ? 'Let’s stay in touch' : 'Before you go'}</span>
      <h2 style={{ margin: 0 }}>Tell us who visited today</h2>
      <p className="muted small" style={{ margin: 0 }}>Leave your details and we’ll send you new courses, free sessions and invitations from Awelen Entrepreneurs. No spam.</p>
      <div className="fg">
        <label className="f"><span>Full name</span><input name="name" required autoComplete="name" /></label>
        <label className="f"><span>Email</span><input type="email" name="email" required autoComplete="email" /></label>
        <label className="f"><span>Phone or WhatsApp (optional)</span><input name="phone" autoComplete="tel" /></label>
        <label className="f"><span>What brought you here?</span>
          <select name="interest"><option>Courses</option><option>Coaching or consulting</option><option>The community</option><option>Partnership or sponsorship</option><option>Just looking around</option></select>
        </label>
      </div>
      <label className="row small"><input type="checkbox" name="ok" required style={{ width: 'auto' }} /> I agree to hear from Awelen Entrepreneurs by email or WhatsApp</label>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div className="row"><Busy busy={busy} cls="btn lemon" label="Send my details" busyLabel="Sending…" /><button type="button" className="btn quiet" onClick={onSkip}>Not now</button></div>
      <p className="small muted" style={{ margin: 0 }}>Already a member? <button type="button" className="linkbtn" onClick={onSignIn}>Sign in</button></p>
    </form>
  );
}

function Thanks({ name, again, signedIn, onClose, onJoin }: { name: string; again: boolean; signedIn: boolean; onClose: () => void; onJoin: () => void }) {
  return (
    <div className="stack exitf">
      <span className="kick">{again ? 'Welcome back' : 'Thank you'}</span>
      <h2 style={{ margin: 0 }}>{again ? `Thanks for visiting again, ${firstName(name)}!` : `Thank you, ${firstName(name)}!`}</h2>
      <p style={{ margin: 0 }}>
        {again
          ? 'It’s good to see you here again. We hope you’ll pick up a course that moves your business forward, or reach out if there is anything we can help with.'
          : 'We’re glad you stopped by. When you’re ready, pick up a course or reach out and tell us what you’re building.'}
      </p>
      <div className="row">
        <Link className="btn lemon" to="/space/courses" onClick={onClose}>Browse courses</Link>
        <Link className="btn quiet" to="/space/contact" onClick={onClose}>Reach out to us</Link>
        {!signedIn && <button className="btn quiet" onClick={onJoin}>Create a free account</button>}
      </div>
    </div>
  );
}
