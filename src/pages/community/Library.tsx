// eBook Collection: free eBooks go on your shelf when you sign in; paid ones unlock after Paystack confirms.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Ebook, Space } from '../../data/types';
import { courseById, naira, site } from '../../data/site';
import { niceError, useAuth } from '../../lib/auth';
import { ebookPdf, getFreeEbook, useShelf } from '../../lib/community';
import { payEbookWithPaystack, paystackKey } from '../../lib/learning';
import { useModals } from '../../components/Modals';
import { Dialog, SpaceHead, Stats } from '../../components/Kit';

const COVERS: Record<string, [string, string, string]> = {
  purple: ['#5b21b6', '#f5ec42', '#ffffff'], ink: ['#121016', '#f5ec42', '#ffffff'], lemon: ['#f5ec42', '#5b21b6', '#121016'],
  lilac: ['#ece3fb', '#5b21b6', '#121016'], crimson: ['#7f1d1d', '#f5ec42', '#ffffff'],
};

export function Cover({ b }: { b: Ebook }) {
  if (b.img) return <img className="cover" src={b.img} alt={'Cover of ' + b.title} />;
  const [bg, ac, ink] = COVERS[b.color || 'purple'] || COVERS.purple;
  const lines: string[] = []; let cur = '';
  b.title.split(/\s+/).forEach((w) => { if ((cur + ' ' + w).trim().length > 13 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur);
  const L = lines.slice(0, 5), y0 = 150 - L.length * 11;
  return (
    <svg className="cover" viewBox="0 0 200 280" role="img" aria-label={'Cover of ' + b.title}>
      <rect width="200" height="280" fill={bg} /><rect width="12" height="280" fill={ac} />
      <circle cx="172" cy="34" r="48" fill="none" stroke={ac} strokeWidth="12" />
      <text x="26" y={y0} fontFamily="Young Serif, Georgia, serif" fontSize="21" fill={ink}>{L.map((l, i) => <tspan key={i} x="26" dy={i ? 25 : 0}>{l}</tspan>)}</text>
      <rect x="26" y={y0 + L.length * 25 - 6} width="40" height="4" fill={ac} />
      <text x="26" y="256" fontFamily="Figtree, sans-serif" fontSize="9.5" fontWeight="700" letterSpacing="1.6" fill={ink} opacity=".85">AWELEN ENTREPRENEURS</text>
    </svg>
  );
}

export function EbooksPage({ s }: { s: Space }) {
  const { session, profile } = useAuth();
  const { openAccount } = useModals();
  const [bump, setBump] = useState(0);
  const shelf = useShelf(bump);
  const [q, setQ] = useState(''); const [cat, setCat] = useState('');
  const [open, setOpen] = useState<Ebook | null>(null);
  const [busy, setBusy] = useState(''); const [msg, setMsg] = useState<Record<string, string>>({});
  const bs = site.ebooks.filter((b) => b.space === s.id);
  const cats = [...new Set(bs.map((b) => b.cat))].sort();
  const shown = bs.filter((b) => (!q || (b.title + ' ' + b.sub + ' ' + b.cat).toLowerCase().includes(q.toLowerCase())) && (!cat || b.cat === cat));
  const owns = (b: Ebook) => shelf.has(b.id);
  const say = (id: string, m: string) => setMsg((x) => ({ ...x, [id]: m }));

  const getFree = async (b: Ebook) => {
    if (!session) return openAccount('up');
    setBusy(b.id); say(b.id, '');
    try { await getFreeEbook(b.id); setBump((x) => x + 1); setOpen(b); } catch (err) { say(b.id, niceError(err)); } finally { setBusy(''); }
  };
  const buy = async (b: Ebook) => {
    if (!session) return openAccount('up');
    setBusy(b.id); say(b.id, '');
    try {
      const r = await payEbookWithPaystack({ ebookId: b.id, title: b.title, amount: b.price, email: profile?.email || session.user.email || '', userId: session.user.id });
      if (r === 'paid') { setBump((x) => x + 1); setOpen(b); } else say(b.id, 'Payment window closed. You have not been charged.');
    } catch (err) { say(b.id, niceError(err)); } finally { setBusy(''); }
  };

  return (
    <>
      <SpaceHead s={s}>
        <Stats list={[[bs.length, 'eBooks'], [bs.filter((b) => !b.price).length, 'Free'], [cats.length, 'Topics'], [session ? bs.filter(owns).length : '–', 'On your shelf']]} />
      </SpaceHead>
      <div className="card mfilter">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles and topics" aria-label="Search eBooks" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by topic"><option value="">All topics</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {!shown.length ? <p className="card empty">{bs.length ? 'No eBooks match your search.' : 'No eBooks yet.'}</p> : (
        <div className="grid books">
          {shown.map((b) => {
            const own = owns(b), c = b.course ? courseById(b.course) : undefined;
            return (
              <article className="card book" key={b.id}>
                <div className="cv"><Cover b={b} /></div>
                <div className="bb">
                  <span className="tag" style={{ alignSelf: 'flex-start' }}>{b.cat}</span>
                  <h3>{b.title}</h3>
                  <p className="small muted" style={{ margin: 0 }}>{b.sub}</p>
                  <p className="small muted" style={{ margin: 0 }}>{b.pages ? b.pages + ' pages' : ''}{c && <> · goes with <Link to={'/course/' + c.id}>{c.title}</Link></>}</p>
                  <div className="spread" style={{ marginTop: 'auto', paddingTop: 8 }}>
                    <span className="price">{b.price ? naira(b.price) : 'Free'}{own && b.price ? <> <span className="badge">Owned</span></> : null}</span>
                    <div className="row" style={{ gap: 4 }}>
                      {own ? <button className="btn sm" onClick={() => setOpen(b)}>📖 Read</button>
                        : !b.price ? <button className="btn sm" disabled={busy === b.id} onClick={() => getFree(b)}>Get it free</button>
                        : paystackKey ? <button className="btn lemon sm" disabled={busy === b.id} onClick={() => buy(b)}>{busy === b.id ? 'Please wait…' : 'Buy · ' + naira(b.price)}</button>
                        : <button className="btn quiet sm" onClick={() => setOpen(b)}>Details</button>}
                    </div>
                  </div>
                  {msg[b.id] && <p className="small formmsg" role="alert" style={{ margin: '6px 0 0' }}>{msg[b.id]}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Dialog open={!!open} onClose={() => setOpen(null)}>{open && <Reader b={open} owned={owns(open)} />}</Dialog>
    </>
  );
}

function Reader({ b, owned }: { b: Ebook; owned: boolean }) {
  const [msg, setMsg] = useState('');
  const download = async () => {
    setMsg('');
    try { const u = await ebookPdf(b.id); if (u) window.open(u, '_blank', 'noopener'); else setMsg('The PDF for this eBook is being added. Check back soon.'); }
    catch (err) { setMsg(niceError(err)); }
  };
  return (
    <div>
      <div className="bookhead">
        <div style={{ width: 130, flexShrink: 0 }}><Cover b={b} /></div>
        <div style={{ minWidth: 0 }}><span className="tag">{b.cat}</span><h2 style={{ margin: '6px 0 2px' }}>{b.title}</h2><p className="muted" style={{ margin: 0 }}>{b.sub}</p>
          <p className="small muted">{b.pages ? b.pages + ' pages · ' : ''}by {b.author || site.creator.name}</p></div>
      </div>
      <p style={{ marginTop: 14, whiteSpace: 'pre-line' }}>{b.desc}</p>
      {(b.toc || []).length > 0 && <><h3>Inside</h3><ol className="small" style={{ marginTop: 4 }}>{b.toc!.map((x) => <li key={x}>{x}</li>)}</ol></>}
      {owned ? <div className="row" style={{ marginTop: 12 }}><button className="btn" onClick={download}>⬇ Open the PDF</button></div>
        : b.price > 0 && !paystackKey ? <div className="notice small" style={{ marginTop: 12 }}>Card payments for eBooks open soon. To buy it now, <Link to="/space/contact">contact us</Link>.</div> : null}
      {msg && <p className="formmsg" role="alert" style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}
