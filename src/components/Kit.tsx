// Small building blocks shared by the community and programme spaces. They reuse the original class names.
import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Course, Space } from '../data/types';
import { cm, lessonCount } from '../data/site';
import { initials } from '../pages/PublicPages';

/** Space heading card: headline, description and anything extra (stats, tabs, buttons). */
export function SpaceHead({ s, children }: { s: Space; children?: ReactNode }) {
  return (
    <section className="card">
      <h1>{s.headline || s.name}</h1>
      {s.desc && s.desc.split('\n\n').map((p, i) => <p key={i} className={i === 0 ? 'lead' : ''} style={{ marginBottom: 0 }}>{p}</p>)}
      {children}
    </section>
  );
}

/** Tabs inside a space: /space/:id, /space/:id/:sub */
export function Tabs({ s, label, list, tab }: { s: Space; label: string; list: [string, string][]; tab: string }) {
  return (
    <nav className="tabs" aria-label={label}>
      {list.map(([k, l]) => (
        <Link key={k} to={'/space/' + s.id + (k === 'about' ? '' : '/' + k)} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined}>{l}</Link>
      ))}
    </nav>
  );
}

export type RuleItem = [icon: string, title: string, text: string, hard?: boolean];
export function Rules({ list }: { list: RuleItem[] }) {
  return (
    <div className="rules">
      {list.map(([i, t, d, hard]) => (
        <div key={t} className={'rule' + (hard ? ' hard' : '')}><span className="ri" aria-hidden="true">{i}</span><div style={{ minWidth: 0 }}><b>{t}</b><p>{d}</p></div></div>
      ))}
    </div>
  );
}

export function Steps({ list }: { list: [title: ReactNode, text?: ReactNode][] }) {
  return (
    <ol className="steps">
      {list.map(([t, d], i) => <li key={i}><div><b>{t}</b>{d && <div className="muted small">{d}</div>}</div></li>)}
    </ol>
  );
}

export function Howto({ list }: { list: [icon: string, bold: ReactNode, rest: ReactNode][] }) {
  return (
    <div className="howto">
      {list.map(([i, b, r], k) => <div key={k}><span className="hi" aria-hidden="true">{i}</span><p><b>{b}</b> {r}</p></div>)}
    </div>
  );
}

export function Table({ head, rows, min = 520 }: { head: string[]; rows: string[][]; min?: number }) {
  return (
    <div className="tablewrap">
      <table className="mtable" style={{ minWidth: min }}>
        <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{j ? c : <b>{c}</b>}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Faq({ list }: { list: [string, string][] }) {
  return <>{list.map(([q, a]) => <details className="mod" key={q}><summary>{q}</summary><p style={{ margin: 0, padding: '0 14px 12px' }}>{a}</p></details>)}</>;
}

export function Stats({ list }: { list: [ReactNode, string][] }) {
  return <div className="mstats">{list.map(([n, l]) => <div key={l}><b>{n}</b><span>{l}</span></div>)}</div>;
}

export function Avatar({ name, size = 36, creator }: { name: string; size?: number; creator?: boolean }) {
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: creator ? 'var(--black)' : undefined, color: creator ? 'var(--lemon)' : undefined }}>
      {initials(name)}
    </span>
  );
}

/** A pop-up window for forms and details. Close with ×, Escape or a click outside. */
export function Dialog({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} style={wide ? { width: 'min(760px, calc(100vw - 24px))' } : undefined}>
      <div className="dc">
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        {open && children}
      </div>
    </dialog>
  );
}

/** A course tile, as on the track pages. */
export function CourseCard({ c }: { c: Course }) {
  const n = lessonCount(c);
  return (
    <Link className="card tile ccard" to={'/course/' + c.id}>
      <div className="strip" />
      <h3>{c.title}</h3>
      {c.sub && <p className="muted small">{c.sub}</p>}
      <p className="small muted" style={{ margin: '-4px 0 10px' }}>{c.modules.length} module{c.modules.length === 1 ? '' : 's'} · {n} lesson{n === 1 ? '' : 's'}</p>
      <div className="spread small"><span className="price">{priceLine(c)}</span></div>
    </Link>
  );
}

export const priceLine = (c: Course) =>
  c.mode === 'application' ? 'By application' : !(c.price > 0) ? 'Free' :
  cm(c, c.price) + (c.instN > 1 && c.instAmt > 0 ? ` or ${c.instN} × ${cm(c, c.instAmt)}` : '');

/** Reads common form fields as trimmed strings. */
export const fields = (form: HTMLFormElement) => {
  const fd = new FormData(form);
  return (k: string) => String(fd.get(k) ?? '').trim();
};

/** "Thank you" box shown after a form is sent. */
export function Sent({ title, children, onAgain, again = 'Send another' }: { title: string; children?: ReactNode; onAgain?: () => void; again?: string }) {
  return (
    <div className="stack">
      <h2 style={{ margin: 0 }}>✓ {title}</h2>
      {children}
      {onAgain && <div><button className="btn quiet sm" onClick={onAgain}>{again}</button></div>}
    </div>
  );
}
