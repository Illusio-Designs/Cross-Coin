import { useState, useEffect } from 'react';
import Head from 'next/head';

/*
 * Razorpay Magic (one-click) Checkout — isolated TEST page.
 *
 * Route: /magic-checkout-test  (not linked anywhere; open it directly)
 *
 * Loads REAL products from the live catalog, lets you pick one, then asks the
 * backend to create a Magic order (line_items + one_click_checkout) and opens
 * Razorpay's Magic modal (phone → OTP → address from its network, with our
 * shipping/coupon callbacks). After payment it verifies and prints everything —
 * including the address Magic returned. Nothing here touches the live cart.
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = 'crosscoin';

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(true);
    const existing = document.getElementById('rzp-magic-script');
    if (existing) { existing.addEventListener('load', () => resolve(true)); existing.addEventListener('error', () => resolve(false)); return; }
    const s = document.createElement('script');
    s.id = 'rzp-magic-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Normalise a catalogue product to what the Magic order needs, from its first
// in-stock variation (falls back to product-level fields).
function normalize(p) {
  const vars = p.ProductVariations || p.variations || [];
  const v = vars.find((x) => Number(x.stock) > 0) || vars[0] || {};
  const imgs = p.ProductImages || p.images || [];
  const img = imgs.find((i) => i.is_primary) || imgs[0] || {};
  const sale = Number(v.price ?? p.price ?? 0);
  const mrp = Number(v.comparePrice ?? p.comparePrice ?? sale);
  return {
    id: String(p.id),
    name: p.name || 'Product',
    sku: v.sku || p.sku || String(p.id),
    variant_id: v.id != null ? String(v.id) : undefined,
    price: mrp > sale ? mrp : sale,   // MRP
    offer_price: sale,                // selling price
    image_url: img.image_url || img.url || '',
    stock: Number(v.stock ?? 0),
  };
}

export default function MagicCheckoutTest() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [status, setStatus] = useState('Idle');
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);

  const push = (label, data) => setLog((l) => [{ t: new Date().toLocaleTimeString(), label, data }, ...l]);

  // Load real products from the live catalogue.
  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/products/catalog?limit=30`, { headers: { 'X-Brand-Name': BRAND } })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list = d.products || d.data?.products || d.data || [];
        const norm = (Array.isArray(list) ? list : []).map(normalize).filter((p) => p.offer_price > 0);
        setProducts(norm);
        if (norm[0]) setSelectedId(norm[0].id);
        setLoadingProducts(false);
        if (!norm.length) setStatus('No products returned by /api/products/catalog');
      })
      .catch((e) => { if (alive) { setLoadingProducts(false); setStatus('Failed to load products: ' + (e?.message || e)); } });
    return () => { alive = false; };
  }, []);

  const selected = products.find((p) => p.id === selectedId) || null;
  const lineTotal = selected ? selected.offer_price * qty : 0;

  const pay = async () => {
    if (!selected) { setStatus('Pick a product first'); return; }
    setBusy(true);
    setStatus('Loading Razorpay…');
    try {
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) { setStatus('Failed to load Razorpay script (check CSP / network)'); setBusy(false); return; }

      const items = [{
        sku: selected.sku,
        variant_id: selected.variant_id,
        name: selected.name,
        price: selected.price,
        offer_price: selected.offer_price,
        quantity: qty,
        image_url: selected.image_url,
      }];
      push('Cart sent to /api/magic/order', items);

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
        one_click_checkout: true,
        show_coupons: true,
        name: 'Cross Coin',
        description: selected.name,
        image: selected.image_url || undefined,
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
  const ctl = { border: '1px solid #ccc', borderRadius: 6, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit' };

  return (
    <>
      <Head><title>Magic Checkout Test</title><meta name="robots" content="noindex" /></Head>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: 24, fontFamily: 'DM Sans, system-ui, sans-serif', color: '#1a1a1a' }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Razorpay Magic Checkout — Test</h1>
        <p style={{ color: '#777', fontSize: 13, marginTop: 0 }}>
          Real products from the live catalogue. Uses <code>/api/magic/*</code>. Use Razorpay <b>test</b> keys to test safely.
        </p>

        <div style={box}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Choose a real product</h3>
          {loadingProducts ? (
            <p style={{ color: '#999', fontSize: 14 }}>Loading products…</p>
          ) : products.length === 0 ? (
            <p style={{ color: '#c62828', fontSize: 14 }}>No products loaded — {status}</p>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ ...ctl, minWidth: 320, flex: 1 }}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{p.offer_price.toLocaleString('en-IN')} ({p.sku}){p.stock <= 0 ? ' · out of stock' : ''}
                  </option>
                ))}
              </select>
              <label style={{ fontSize: 13, color: '#555' }}>Qty&nbsp;
                <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} style={{ ...ctl, width: 64 }} />
              </label>
            </div>
          )}

          {selected && (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 14 }}>
              {selected.image_url ? <img src={selected.image_url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} /> : null}
              <div style={{ fontSize: 14 }}>
                <div style={{ fontWeight: 700 }}>{selected.name}</div>
                <div style={{ color: '#555' }}>
                  ₹{selected.offer_price.toLocaleString('en-IN')}
                  {selected.price > selected.offer_price && <span style={{ color: '#999', textDecoration: 'line-through', marginLeft: 8 }}>₹{selected.price.toLocaleString('en-IN')}</span>}
                  <span style={{ marginLeft: 10, color: '#777' }}>SKU {selected.sku}</span>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontWeight: 700 }}>Total: ₹{lineTotal.toLocaleString('en-IN')}</div>
            </div>
          )}
          <p style={{ color: '#999', fontSize: 12, marginBottom: 0, marginTop: 12 }}>Shipping / coupon are applied inside Magic via our callbacks.</p>
        </div>

        <button
          onClick={pay}
          disabled={busy || !selected}
          style={{ background: '#180D3E', color: '#fff', border: 0, borderRadius: 8, padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: busy || !selected ? 'default' : 'pointer', opacity: busy || !selected ? 0.6 : 1 }}
        >
          {busy ? 'Working…' : 'Pay with Magic Checkout'}
        </button>

        <div style={{ ...box, marginTop: 16 }}><strong>Status:</strong> {status}</div>

        <h3 style={{ fontSize: 15 }}>Log (newest first)</h3>
        {log.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>Nothing yet — pick a product and click Pay.</p>}
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
