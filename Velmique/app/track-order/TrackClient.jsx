'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { trackOrder } from '@/lib/api/orders';
import {
  orderStatusLabel, orderStatusTone, isCancelledStatus,
  trackingStep, orderStatusNote, paymentSummary, canRequestReturn,
} from '@/utils/orderStatus';
import { resolveImageUrl, pickItemImage, fmtAttrs } from '@/lib/orderItems';

const STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'dispatched', label: 'Packed' },
  { key: 'out_for_delivery', label: 'On its way' },
  { key: 'delivered', label: 'Delivered' },
];
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (v) => { if (!v) return '—'; try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return '—'; } };
const fmtDateTime = (v) => { if (!v) return ''; try { return new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return ''; } };

// Shared trackingStep(): -1 pre-confirmation, 0 Confirmed, 1 Packed, 2 Shipped,
// 3 Delivered → this page's 5-step bar (doorstep states sit on "On its way").
function stepIndex(d) {
  const raw = d?.order?.status;
  if (isCancelledStatus(raw)) return -1;
  const s = String(raw || '').trim().toLowerCase().replace(/_/g, ' ');
  const step = trackingStep(raw);
  if (step === 3) return 4;
  if (step === 2) return ['out for delivery', 'undelivered'].includes(s) ? 3 : 2;
  if (step === 1) return 2;
  if (step === 0) return 1;
  return 0;
}

// Courier scans first (newest first), else the order's own status history.
function timeline(d) {
  const fship = d?.fship_data?.tracking_history;
  if (Array.isArray(fship) && fship.length) {
    return [...fship].reverse().map((h) => ({ status: h.status, note: h.location || h.description || '', time: h.timestamp || h.created_at || '' }));
  }
  const sh = d?.status_history;
  if (Array.isArray(sh) && sh.length) {
    const list = isCancelledStatus(d?.order?.status) ? sh : sh.filter((h) => h.status !== 'cancelled');
    return [...list].reverse().map((h) => ({ status: h.status, note: h.notes || '', time: h.created_at || h.createdAt || '' })).filter((i) => i.status);
  }
  return [];
}

export default function TrackClient() {
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

  useEffect(() => { if (initial) { setInput(initial); track(initial); } /* eslint-disable-next-line */ }, [initial]);

  const o = data?.order;
  const active = data ? stepIndex(data) : -1;
  const pct = active > 0 ? (active / (STEPS.length - 1)) * 100 : 0;
  const events = data ? timeline(data) : [];
  const note = o ? orderStatusNote(o.status, o.payment_type) : '';
  const trackingUrl = data?.tracking?.tracking_url || o?.tracking_url;
  const awb = o?.tracking_number || data?.tracking?.tracking_number;
  const addr = data?.shipping_address;

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">Order status</span>
        <h1>Track Your Order.</h1>
        <p>Enter your order number to see live shipment progress.</p>
      </section>

      <div className="m-wrap m-section m-track" style={{ paddingTop: 0 }}>
        <form className="m-trackform" onSubmit={(e) => { e.preventDefault(); track(); }}>
          <input className="m-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. VLM-2026-001284" aria-label="Order number" autoComplete="off" />
          <button type="submit" className="m-btn m-btn--fill" disabled={loading}>{loading ? 'Tracking…' : 'Track'}</button>
        </form>

        {error && !loading ? <div className="m-alert m-alert--err" role="alert">{error}</div> : null}
        {loading ? <div className="m-ordcard"><div className="m-skel" style={{ aspectRatio: 'auto', height: 140 }} /></div> : null}

        {o ? (
          <>
            <div className="m-ordcard">
              <div className="m-ordhead">
                <div>
                  <span className="m-eyebrow">Order</span>
                  <div className="m-crow__n">#{o.order_number}</div>
                  <div className="m-jcard__meta" style={{ marginTop: 6 }}>{fmtDate(o.created_at || o.createdAt)} · {data.items?.length || 0} item{(data.items?.length || 0) === 1 ? '' : 's'} · {fmt(o.final_amount)}</div>
                </div>
                <span className={`m-badge m-badge--${orderStatusTone(o.status)}`}>{orderStatusLabel(o.status)}</span>
              </div>
              {note ? <p className="m-note-line">{note}</p> : null}

              {active >= 0 ? (
                <div className="m-steps" role="list" aria-label="Shipment progress">
                  <span className="fill" style={{ width: `calc(80% * ${pct / 100})` }} />
                  {STEPS.map((s, i) => (
                    <div role="listitem" className={`m-step ${i < active ? 'done' : i === active ? 'active' : ''}`} key={s.key} aria-current={i === active ? 'step' : undefined}>
                      <span className="dot">{i <= active ? '✓' : i + 1}</span>
                      <small>{s.label}</small>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="m-trackgrid">
              <div className="m-ordcard">
                <h2 className="m-card-h">Timeline</h2>
                {events.length ? (
                  <ol className="m-timeline">
                    {events.map((ev, i) => (
                      <li key={i} className={i === 0 ? 'now' : ''}>
                        <b>{orderStatusLabel(ev.status)}</b>
                        {ev.note ? <span>{ev.note}</span> : null}
                        {ev.time ? <small>{fmtDateTime(ev.time)}</small> : null}
                      </li>
                    ))}
                  </ol>
                ) : <p className="m-muted">No tracking events yet — they appear once the parcel is handed to the courier.</p>}
              </div>

              <div className="m-ordcard">
                <h2 className="m-card-h">Payment</h2>
                <div className="m-sumrow"><span>Method</span><span>{o.payment_status ? paymentSummary(o.payment_type, o.payment_status) : (o.payment_type === 'cod' ? 'Cash on Delivery' : 'Prepaid')}</span></div>
                <div className="m-sumrow"><span>AWB</span><span>{awb || 'Not assigned yet'}</span></div>
                <div className="m-sumrow tot"><span>Total</span><b>{fmt(o.final_amount)}</b></div>
                {trackingUrl ? <a className="m-btn m-btn--ghost" href={trackingUrl} target="_blank" rel="noopener noreferrer" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}>Track with courier ↗</a> : null}
              </div>
            </div>

            <div className="m-ordcard">
              <h2 className="m-card-h">Items</h2>
              <ul className="m-olines">
                {(data.items || []).map((it, i) => {
                  const img = pickItemImage(it);
                  const attrs = fmtAttrs(it.variation?.attributes || it.ProductVariation?.attributes);
                  return (
                    <li key={it.id || i}>
                      {img ? <img src={resolveImageUrl(img)} alt="" loading="lazy" /> : <span className="m-olines__ph" />}
                      <div>
                        <b>{it.product?.name || it.Product?.name || 'Item'}</b>
                        <small>{attrs ? `${attrs} · ` : ''}Qty {it.quantity}</small>
                      </div>
                      <span>{fmt(it.total_price || (parseFloat(it.price) * (it.quantity || 1)))}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {addr ? (
              <div className="m-ordcard">
                <h2 className="m-card-h">Deliver to</h2>
                <p className="m-crow__n" style={{ fontSize: 18 }}>{addr.full_name}</p>
                <p className="m-muted" style={{ marginTop: 6 }}>{addr.address}, {addr.city}, {addr.state} — {addr.pincode || addr.postal_code}</p>
                {addr.phone || addr.phone_number ? <p className="m-muted" style={{ marginTop: 4 }}>{addr.phone || addr.phone_number}</p> : null}
              </div>
            ) : null}

            <div className="m-oc__cta" style={{ marginTop: 8 }}>
              {canRequestReturn(o.status) ? <Link className="m-btn m-btn--ghost" href="/account/returns">Request a return</Link> : null}
              <Link className="m-btn m-btn--ghost" href="/account">My orders</Link>
              <Link className="m-btn m-btn--ghost" href="/contact">Need help?</Link>
            </div>
          </>
        ) : (!loading && !error) ? (
          <div className="m-empty"><h3>Your shipment, in real time</h3><p>Enter your order number above to view its status, timeline and items. You&rsquo;ll find it in your order confirmation on WhatsApp.</p></div>
        ) : null}
      </div>
    </>
  );
}
