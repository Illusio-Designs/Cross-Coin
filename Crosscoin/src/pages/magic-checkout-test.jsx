import { useState } from 'react';
import Head from 'next/head';

/*
 * Razorpay Magic (one-click) Checkout — isolated TEST page.
 *
 * Route: /magic-checkout-test  (not linked anywhere; open it directly)
 *
 * It builds a small sample cart, asks our backend to create a Magic order
 * (line_items + one_click_checkout), opens Razorpay's Magic modal (which
 * collects phone → OTP → address from its network and calls our shipping /
 * coupon callbacks), then verifies the payment and shows exactly what came back
 * — including the address Magic returned. Nothing here touches the live cart.
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = 'crosscoin';

const DEFAULT_ITEMS = [
  { sku: 'CC-1234', name: 'Five-Toe Cotton Socks', price: 999, offer_price: 499, quantity: 1, image_url: '' },
  { sku: 'CC-5678', name: 'Ankle Socks — Pack of 3', price: 799, offer_price: 599, quantity: 2, image_url: '' },
];

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(true);
    if (document.getElementById('rzp-magic-script')) {
      document.getElementById('rzp-magic-script').addEventListener('load', () => resolve(true));
      return;
    }
    const s = document.createElement('script');
    s.id = 'rzp-magic-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function MagicCheckoutTest() {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [status, setStatus] = useState('Idle');
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);

  const push = (label, data) =>
    setLog((l) => [{ t: new Date().toLocaleTimeString(), label, data }, ...l]);

  const total = items.reduce((s, it) => s + Number(it.offer_price ?? it.price) * Number(it.quantity || 1), 0);

  const updateItem = (i, key, val) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));

  const pay = async () => {
    setBusy(true);
    setStatus('Loading Razorpay…');
    try {
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) { setStatus('Failed to load Razorpay script'); setBusy(false); return; }

      setStatus('Creating Magic order…');
      const orderRes = await fetch(`${API}/api/magic/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({ items }),
      });
      const order = await orderRes.json();
      push('POST /api/magic/order → response', order);
      if (!order.success || !order.order_id) { setStatus('Order creation failed — see log'); setBusy(false); return; }

      setStatus('Opening Magic Checkout…');
      const rzp = new window.Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        one_click_checkout: true,   // Magic modal (address from network + our callbacks)
        show_coupons: true,         // surface coupons via our /api/magic/coupons + apply-coupon
        name: 'Cross Coin',
        description: 'Magic Checkout Test',
        theme: { color: '#180D3E' },
        handler: async (response) => {
          push('Razorpay success payload', response);
          setStatus('Verifying payment…');
          const verRes = await fetch(`${API}/api/magic/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const ver = await verRes.json();
          push('POST /api/magic/verify → response (address is here)', ver);
          setStatus(ver.verified ? '✅ Paid & verified — address returned (see log)' : '⚠️ Verification failed — see log');
          setBusy(false);
        },
        modal: { ondismiss: () => { setStatus('Modal dismissed'); setBusy(false); } },
      });
      rzp.on('payment.failed', (resp) => { push('payment.failed', resp?.error || resp); setStatus('❌ Payment failed — see log'); setBusy(false); });
      rzp.open();
    } catch (e) {
      push('Error', String(e?.message || e));
      setStatus('Error — see log');
      setBusy(false);
    }
  };

  const box = { border: '1px solid #e0e0e0', borderRadius: 10, padding: 16, marginBottom: 16, background: '#fff' };
  const input = { border: '1px solid #ccc', borderRadius: 6, padding: '6px 8px', fontSize: 13, width: '100%' };

  return (
    <>
      <Head><title>Magic Checkout Test</title><meta name="robots" content="noindex" /></Head>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: 24, fontFamily: 'DM Sans, system-ui, sans-serif', color: '#1a1a1a' }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Razorpay Magic Checkout — Test</h1>
        <p style={{ color: '#777', fontSize: 13, marginTop: 0 }}>
          Isolated test surface. Uses <code>/api/magic/*</code>. Set your Razorpay <b>test</b> keys in brand settings to test safely.
        </p>

        <div style={box}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Sample cart (editable)</h3>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr 0.7fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input style={input} value={it.name} onChange={(e) => updateItem(i, 'name', e.target.value)} placeholder="Name" />
              <input style={input} value={it.sku} onChange={(e) => updateItem(i, 'sku', e.target.value)} placeholder="SKU" />
              <input style={input} type="number" value={it.price} onChange={(e) => updateItem(i, 'price', Number(e.target.value))} placeholder="MRP" />
              <input style={input} type="number" value={it.offer_price} onChange={(e) => updateItem(i, 'offer_price', Number(e.target.value))} placeholder="Sale" />
              <input style={input} type="number" value={it.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} placeholder="Qty" />
            </div>
          ))}
          <div style={{ fontWeight: 700, marginTop: 8 }}>Items total: ₹{total.toLocaleString('en-IN')}
            <span style={{ fontWeight: 400, color: '#777', fontSize: 12, marginLeft: 8 }}>(+ shipping / − coupon are applied inside Magic via our callbacks)</span>
          </div>
        </div>

        <button
          onClick={pay}
          disabled={busy}
          style={{ background: '#180D3E', color: '#fff', border: 0, borderRadius: 8, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Working…' : 'Pay with Magic Checkout'}
        </button>

        <div style={{ ...box, marginTop: 16 }}>
          <strong>Status:</strong> {status}
        </div>

        <h3 style={{ fontSize: 15 }}>Log (newest first)</h3>
        {log.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>Nothing yet — click Pay.</p>}
        {log.map((entry, i) => (
          <div key={i} style={{ ...box, marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: '#777' }}>{entry.t} · <b>{entry.label}</b></div>
            <pre style={{ margin: '6px 0 0', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f7f7f9', padding: 10, borderRadius: 6 }}>
              {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </>
  );
}
