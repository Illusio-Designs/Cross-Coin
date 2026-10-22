'use client';

import { useEffect, useState } from 'react';
import { openShiprocketCheckout, confirmShiprocketOrder } from '@/lib/api/shiprocketCheckout';

const PATH = '/shiprocket-test';
const inr = (v) => `₹${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;

const box = { border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, background: '#fff' };
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

  // Back from Shiprocket: ?oid=<their order>&ost=<status>.
  const [ret, setRet] = useState(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const oid = q.get('oid');
    if (!oid) return;
    const ost = String(q.get('ost') || '').toUpperCase();
    setRet({ oid, ost, state: ost === 'SUCCESS' ? 'confirming' : 'failed' });
    if (ost !== 'SUCCESS') return;
    let tries = 3;
    const go = () => confirmShiprocketOrder(oid)
      .then((o) => setRet({ oid, ost, state: 'done', order: o }))
      .catch((e) => { if (--tries > 0) setTimeout(go, 2500); else setRet({ oid, ost, state: 'error', error: e.message }); });
    go();
  }, []);

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
      await openShiprocketCheckout(e, lines, PATH);
      setMsg(null);
    } catch (err) {
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
    </main>
  );
}
