'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { openShiprocketCheckout, confirmShiprocketOrder } from '@/lib/api/shiprocketCheckout';

const PATH = '/shiprocket-test';
const inr = (v) => `₹${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;

const box = { border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, background: '#fff' };

// ── Debug log ────────────────────────────────────────────────────────────
// Everything around the Shiprocket window is recorded here and kept in
// sessionStorage, so it survives a reload / redirect and can be copied.
const LOG_KEY = 'sr-test-log';
const SR_HOST = /shiprocket|fastrr|pickrr/i;
const mask = (v, depth = 0) => {
  if (depth > 12) return '…';
  if (Array.isArray(v)) return v.slice(0, 30).map((x) => mask(x, depth + 1));
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v).slice(0, 40)) {
      out[k] = /token|secret|key|authorization/i.test(k) && typeof x === 'string' && x.length > 12
        ? `${x.slice(0, 6)}…(${x.length})` : mask(x, depth + 1);
    }
    return out;
  }
  if (typeof v === 'string' && v.length > 600) return `${v.slice(0, 600)}…`;
  return v;
};
// True only when the URL's host is Shiprocket's (not when our own page
// address — /shiprocket-test — just appears in a tracker's query string).
const isSrUrl = (u) => { try { return SR_HOST.test(new URL(String(u), window.location.href).hostname); } catch { return false; } };
// Shiprocket's reason for giving up, wherever it sits inside a message.
const findFailure = (v, depth = 0) => {
  if (!v || typeof v !== 'object' || depth > 12) return null;
  for (const [k, x] of Object.entries(v)) {
    if (/failure|error|reason/i.test(k) && x && typeof x !== 'object') return String(x);
    const inner = findFailure(x, depth + 1);
    if (inner) return inner;
  }
  return null;
};
const FAIL_KEY = 'sr-test-failure';
// Hide token / key values carried in a URL's query string.
const safeUrl = (u) => String(u).replace(/([?&](?:token|key|secret|access_token)=)[^&#]+/gi, '$1…');
const readLog = () => { try { return JSON.parse(sessionStorage.getItem(LOG_KEY) || '[]'); } catch { return []; } };
const saveLog = (l) => { try { sessionStorage.setItem(LOG_KEY, JSON.stringify(l.slice(-300))); } catch { /* full / blocked */ } };
const btn = { padding: '10px 16px', borderRadius: 10, border: '1px solid #111', background: '#111', color: '#fff', fontWeight: 600, cursor: 'pointer' };
const btnGhost = { ...btn, background: '#fff', color: '#111' };

export default function ShiprocketTestClient({ products }) {
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const product = products.find((p) => String(p.id) === String(productId));
  const [variantId, setVariantId] = useState(product?.variants[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { kind: 'error'|'ok'|'info', text }
  const [logs, setLogs] = useState([]);
  const logRef = useRef([]);
  const log = useCallback((type, text, data) => {
    const entry = { t: new Date().toISOString().slice(11, 23), type, text: String(text), data: data === undefined ? undefined : mask(data) };
    logRef.current = [...logRef.current, entry].slice(-300);
    saveLog(logRef.current);
    setLogs(logRef.current);
  }, []);

  // Watch the page while testing: Shiprocket's window messages, its network
  // calls, errors, and when its window (iframe / overlay) is added or removed.
  useEffect(() => {
    logRef.current = readLog();
    setLogs(logRef.current);
    log('info', `Page loaded: ${window.location.pathname}${window.location.search}`, { userAgent: navigator.userAgent });

    const onMsg = (e) => {
      if (!isSrUrl(e.origin)) return;
      let data = e.data;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch { /* keep text */ } }
      log('message', `Message from ${e.origin}`, data);
      const why = findFailure(data);
      if (why) {
        log('error', `Shiprocket says: ${why}`);
        try { sessionStorage.setItem(FAIL_KEY, why); } catch { /* blocked */ }
      }
    };
    const onErr = (e) => log('error', `Page error: ${e.message}`, { source: e.filename, line: e.lineno });
    const onRej = (e) => log('error', `Unhandled promise rejection: ${e.reason?.message || e.reason}`);
    const onHide = () => log('info', 'Page is unloading / navigating away');
    window.addEventListener('message', onMsg);
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    window.addEventListener('pagehide', onHide);

    const origErr = console.error; const origWarn = console.warn;
    console.error = (...a) => { log('console', `console.error: ${a.map((x) => (x?.message || (typeof x === 'object' ? JSON.stringify(mask(x)) : String(x)))).join(' ')}`); origErr.apply(console, a); };
    console.warn = (...a) => { log('console', `console.warn: ${a.map((x) => (x?.message || (typeof x === 'object' ? JSON.stringify(mask(x)) : String(x)))).join(' ')}`); origWarn.apply(console, a); };

    const origFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = String(input?.url || input);
      const watch = isSrUrl(url);
      try {
        const r = await origFetch(input, init);
        if (watch) {
          let body;
          try { body = await r.clone().json(); } catch { try { body = (await r.clone().text()).slice(0, 400); } catch { body = undefined; } }
          log(r.ok ? 'network' : 'error', `fetch ${init?.method || 'GET'} ${safeUrl(url)} → ${r.status}`, body);
        }
        return r;
      } catch (err) {
        if (watch) log('error', `fetch ${safeUrl(url)} failed: ${err.message}`);
        throw err;
      }
    };
    const XO = XMLHttpRequest.prototype.open; const XS = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function open(m, u, ...rest) { this.__srUrl = String(u); this.__srM = m; return XO.call(this, m, u, ...rest); };
    XMLHttpRequest.prototype.send = function send(...a) {
      if (isSrUrl(this.__srUrl || '')) {
        this.addEventListener('loadend', () => {
          let body = this.responseText; try { body = JSON.parse(body); } catch { body = String(body || '').slice(0, 400); }
          log(this.status >= 200 && this.status < 400 ? 'network' : 'error', `xhr ${this.__srM} ${safeUrl(this.__srUrl)} → ${this.status}`, body);
        });
      }
      return XS.apply(this, a);
    };

    const describe = (n) => `${n.tagName?.toLowerCase()}${n.id ? `#${n.id}` : ''}${n.className && typeof n.className === 'string' ? `.${n.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''}${n.src ? ` src=${safeUrl(n.src)}` : ''}`;
    const interesting = (n) => n.nodeType === 1 && (n.tagName === 'IFRAME' || /shiprocket|fastrr|headless|checkout/i.test(`${n.id} ${typeof n.className === 'string' ? n.className : ''} ${n.src || ''}`));
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => { if (interesting(n)) log('dom', `Added ${describe(n)}`); });
        m.removedNodes.forEach((n) => { if (interesting(n)) log('dom', `Removed ${describe(n)}`); });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('message', onMsg); window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej); window.removeEventListener('pagehide', onHide);
      console.error = origErr; console.warn = origWarn; window.fetch = origFetch;
      XMLHttpRequest.prototype.open = XO; XMLHttpRequest.prototype.send = XS; mo.disconnect();
    };
  }, [log]);
  const copyLog = async () => {
    const text = logs.map((l) => `${l.t} [${l.type}] ${l.text}${l.data !== undefined ? ` ${JSON.stringify(l.data)}` : ''}`).join('\n');
    try { await navigator.clipboard.writeText(text); setMsg({ kind: 'info', text: 'Log copied.' }); } catch { setMsg({ kind: 'error', text: 'Copy blocked — select the log text and copy it by hand.' }); }
  };

  // Back from Shiprocket: ?oid=<their order>&ost=<status>.
  const [ret, setRet] = useState(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('sr_fallback')) {
      log('error', 'Shiprocket sent the browser back to the fallback URL — it could not open its checkout (see the events just before this)');
      let why = '';
      try { why = sessionStorage.getItem(FAIL_KEY) || ''; sessionStorage.removeItem(FAIL_KEY); } catch { /* blocked */ }
      setMsg({ kind: 'error', text: `Shiprocket closed and sent you back without opening checkout.${why ? ` Shiprocket says: “${why}”.` : ''} Press Copy log and send it over.` });
    }
    const oid = q.get('oid');
    if (!oid) return;
    const ost = String(q.get('ost') || '').toUpperCase();
    setRet({ oid, ost, state: ost === 'SUCCESS' ? 'confirming' : 'failed' });
    log('step', `Back from Shiprocket: oid=${oid} ost=${ost}`);
    if (ost !== 'SUCCESS') return;
    let tries = 3;
    const go = () => confirmShiprocketOrder(oid)
      .then((o) => { log('step', 'Order confirmed by our backend', o); setRet({ oid, ost, state: 'done', order: o }); })
      .catch((e) => { log('error', `Confirm failed: ${e.message}`); if (--tries > 0) setTimeout(go, 2500); else setRet({ oid, ost, state: 'error', error: e.message }); });
    go();
  }, [log]);

  useEffect(() => { setVariantId(product?.variants[0]?.id ?? ''); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const variant = product?.variants.find((v) => String(v.id) === String(variantId));
  const add = () => {
    if (!product || !variant) return;
    setLines((prev) => {
      const i = prev.findIndex((l) => l.variationId === variant.id);
      if (i >= 0) { const next = [...prev]; next[i] = { ...next[i], quantity: next[i].quantity + qty }; return next; }
      return [...prev, { variationId: variant.id, quantity: qty, name: product.name, label: variant.label, price: variant.price }];
    });
  };
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  const checkout = async (e) => {
    setBusy(true); setMsg({ kind: 'info', text: 'Opening Shiprocket checkout…' });
    try {
      log('step', 'Checkout pressed', { lines: lines.map((l) => ({ variant: l.variationId, qty: l.quantity })) });
      await openShiprocketCheckout(e, lines, PATH, log);
      setMsg(null);
    } catch (err) {
      log('error', `Checkout failed: ${err.message}`);
      setMsg({ kind: 'error', text: err.message });
    } finally { setBusy(false); }
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 64px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#777' }}>Staff test · not for customers</span>
        <h1 style={{ margin: 0, fontSize: 28 }}>Shiprocket checkout test</h1>
        <p style={{ margin: 0, color: '#555' }}>Uses the live Shiprocket Checkout with Morbix’s saved keys. Orders placed here are real orders — cancel test orders in the admin afterwards.</p>
      </header>

      {ret ? (
        <section style={{ ...box, borderColor: ret.state === 'done' ? '#1f7a46' : ret.state === 'confirming' ? '#999' : '#a32a1d' }}>
          <strong>Back from Shiprocket</strong>
          <p style={{ margin: '6px 0 0' }}>Shiprocket order <code>{ret.oid}</code> · status <code>{ret.ost || '—'}</code></p>
          {ret.state === 'confirming' && <p style={{ margin: '6px 0 0' }}>Confirming the order with our server…</p>}
          {ret.state === 'done' && <p style={{ margin: '6px 0 0' }}>Saved as our order <strong>#{ret.order.order_number}</strong> ({inr(ret.order.value)}). It is in the admin under Orders.</p>}
          {ret.state === 'failed' && <p style={{ margin: '6px 0 0' }}>Payment not completed — nothing was charged.</p>}
          {ret.state === 'error' && <p style={{ margin: '6px 0 0', color: '#a32a1d' }}>Could not confirm: {ret.error}</p>}
          <p style={{ margin: '10px 0 0' }}><a href={PATH} style={{ textDecoration: 'underline' }}>Start another test</a></p>
        </section>
      ) : null}

      <section style={{ ...box, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <strong>1. Pick items</strong>
        {products.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 220px' }}>Product
              <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ padding: 8 }}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 180px' }}>Variant
              <select value={variantId} onChange={(e) => setVariantId(e.target.value)} style={{ padding: 8 }}>
                {(product?.variants || []).map((v) => <option key={v.id} value={v.id}>{v.label} · {inr(v.price)}{v.stock <= 0 ? ' · out of stock' : ''}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 80 }}>Qty
              <input type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} style={{ padding: 8 }} />
            </label>
            <button type="button" style={btnGhost} onClick={add} disabled={!variant}>Add</button>
          </div>
        ) : <p style={{ margin: 0 }}>No products found for Morbix.</p>}
      </section>

      <section style={{ ...box, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <strong>2. Check out</strong>
        {lines.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {lines.map((l) => (
              <li key={l.variationId} style={{ margin: '4px 0' }}>
                {l.name} — {l.label} × {l.quantity} · {inr(l.price * l.quantity)}{' '}
                <button type="button" onClick={() => setLines((p) => p.filter((x) => x.variationId !== l.variationId))} style={{ border: 0, background: 'none', color: '#a32a1d', cursor: 'pointer' }}>remove</button>
              </li>
            ))}
          </ul>
        ) : <p style={{ margin: 0, color: '#555' }}>No items yet.</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" style={{ ...btn, opacity: busy || !lines.length ? 0.6 : 1 }} disabled={busy || !lines.length} onClick={checkout}>
            Checkout with Shiprocket{lines.length ? ` · ${inr(total)}` : ''}
          </button>
          <span style={{ color: '#555', fontSize: 14 }}>Prices here are our variant prices; Shiprocket shows its own total.</span>
        </div>
        {msg ? <p style={{ margin: 0, color: msg.kind === 'error' ? '#a32a1d' : '#555' }}>{msg.text}</p> : null}
      </section>

      <section style={{ ...box, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <strong style={{ flex: 1 }}>3. Debug log ({logs.length})</strong>
          <button type="button" style={btnGhost} onClick={copyLog} disabled={!logs.length}>Copy log</button>
          <button type="button" style={btnGhost} onClick={() => { logRef.current = []; saveLog([]); setLogs([]); }}>Clear</button>
        </div>
        <p style={{ margin: 0, color: '#555', fontSize: 14 }}>Kept across reloads in this tab. Press Copy log and paste it to the developer.</p>
        <pre style={{ margin: 0, maxHeight: 420, overflow: 'auto', background: '#0f1115', color: '#d6dde6', borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {logs.length ? logs.map((l, i) => (
            <div key={i} style={{ color: l.type === 'error' ? '#ff8a80' : l.type === 'message' ? '#9ecbff' : l.type === 'network' ? '#b5e48c' : l.type === 'dom' ? '#ffd58a' : '#d6dde6' }}>
              {`${l.t} [${l.type}] ${l.text}`}{l.data !== undefined ? `\n    ${JSON.stringify(l.data)}` : ''}
            </div>
          )) : 'No events yet.'}
        </pre>
      </section>
    </main>
  );
}
