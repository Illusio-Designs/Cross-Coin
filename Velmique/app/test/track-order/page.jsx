'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { trackOrder } from '@/lib/api/orders';

const STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'dispatched', label: 'Packed' },
  { key: 'out_for_delivery', label: 'On Way' },
  { key: 'delivered', label: 'Delivered' },
];
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return '—'; } };

function stepIndex(d) {
  const s = String(d?.order?.status || '').toLowerCase();
  if (s === 'delivered') return 4;
  if (s === 'out_for_delivery' || s === 'out for delivery') return 3;
  if (['shipped', 'in_transit', 'processing', 'booked', 'manifested', 'dispatched', 'pickup_initiated'].includes(s)) return 2;
  if (s === 'confirmed') return 1;
  if (s === 'cancelled') return -1;
  return 0;
}

function Inner() {
  const params = useSearchParams();
  const initial = params?.get('order') || '';
  const [input, setInput] = useState(initial);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const track = async (ref) => {
    const r = (ref ?? input).trim();
    if (!r) { setError('Please enter your order number'); return; }
    setLoading(true); setError(''); setData(null);
    try {
      const resp = await trackOrder(r);
      const payload = resp?.data || resp;
      if (payload?.order) setData(payload); else setError(resp?.message || 'Order not found');
    } catch (e) { setError(e.message || 'Order not found'); } finally { setLoading(false); }
  };

  useEffect(() => { if (initial) track(initial); /* eslint-disable-next-line */ }, [initial]);

  const active = data ? stepIndex(data) : -1;
  const pct = active > 0 ? (active / (STEPS.length - 1)) * 100 : 0;

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">Order status</span>
        <h1>Track Your Order.</h1>
        <p>Enter your order number to see live shipment progress.</p>
      </section>

      <div className="m-wrap m-section m-track" style={{ paddingTop: 0 }}>
        <form className="m-trackform" onSubmit={(e) => { e.preventDefault(); track(); }}>
          <input className="m-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. VLM-2026-001284" aria-label="Order number" />
          <button type="submit" className="m-btn m-btn--fill" disabled={loading}>{loading ? 'Tracking…' : 'Track'}</button>
        </form>

        {error && !loading ? <div className="m-empty" style={{ padding: '30px 24px' }}><p>{error}</p></div> : null}

        {data ? (
          <>
            <div className="m-ordcard">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <div>
                  <small style={{ fontSize: 10, letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--m-accent)' }}>Order</small>
                  <div className="m-crow__n">#{data.order.order_number}</div>
                  <div className="m-jcard__meta" style={{ marginTop: 6 }}>{fmtDate(data.order.created_at || data.order.createdAt)} · {data.items?.length || 0} item(s) · {fmt(data.order.final_amount)}</div>
                </div>
                <span className="m-badge">{String(data.order.status || 'Pending').replace(/_/g, ' ')}</span>
              </div>

              {active >= 0 && (
                <div className="m-steps">
                  <span className="fill" style={{ width: `calc((100% - 20%) * ${pct / 100})` }} />
                  {STEPS.map((s, i) => (
                    <div className={`m-step ${i < active ? 'done' : i === active ? 'active' : ''}`} key={s.key}>
                      <span className="dot">{i <= active ? '✓' : i + 1}</span>
                      <small>{s.label}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="m-ordcard">
              <h3 style={{ fontFamily: 'var(--m-d)', fontSize: 22, marginBottom: 14 }}>Items</h3>
              {(data.items || []).map((it, i) => (
                <div className="m-sumrow" key={i} style={{ borderTop: i ? '1px solid var(--m-line-soft)' : '0', paddingTop: 12 }}>
                  <span>{(it.product?.name || it.Product?.name || 'Item')} × {it.quantity}</span>
                  <span>{fmt(it.total_price || (parseFloat(it.price) * (it.quantity || 1)))}</span>
                </div>
              ))}
            </div>

            {data.shipping_address ? (
              <div className="m-ordcard">
                <h3 style={{ fontFamily: 'var(--m-d)', fontSize: 22, marginBottom: 10 }}>Deliver to</h3>
                <p className="m-crow__n" style={{ fontSize: 18 }}>{data.shipping_address.full_name}</p>
                <p style={{ color: 'var(--m-ink-soft)', fontSize: 14, marginTop: 6 }}>{data.shipping_address.address}, {data.shipping_address.city}, {data.shipping_address.state} - {data.shipping_address.pincode || data.shipping_address.postal_code}</p>
              </div>
            ) : null}
          </>
        ) : (!loading && !error) ? (
          <div className="m-empty"><h3>Your shipment, in real time</h3><p>Enter your order number above to view its status, timeline and items.</p></div>
        ) : null}
      </div>
    </>
  );
}

export default function MaisonTrack() {
  return <Suspense fallback={<div className="m-wrap m-ph"><h1>Track Your Order.</h1></div>}><Inner /></Suspense>;
}
