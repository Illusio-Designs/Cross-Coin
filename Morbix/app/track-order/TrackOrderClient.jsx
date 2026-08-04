'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import ShimmerImg from '@/components/ui/ShimmerImg';
import { trackOrder } from '@/lib/api/orders';
import { toast } from '@/lib/toast';

const STEPS = ['confirmed', 'processing', 'shipped', 'delivered'];

// Order-item images are ImageKit assets. Absolute URLs pass through; relative
// paths get the ImageKit endpoint (NOT the API host — that returns 404s and is
// why the thumbnails were blank).
const IK_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL
  || process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
  || 'https://ik.imagekit.io/wp2oatzmf';
function resolveImg(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let url = raw;
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    url = url.substring(url.lastIndexOf('https://'));
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${IK_ENDPOINT}${url.startsWith('/') ? '' : '/'}${url}`;
}

function pickItemImage(it) {
  const p = it.product || it.Product || {};
  const v = it.variation || it.ProductVariation || {};
  const raw = p.image || p.ProductImages?.[0]?.image_url || p.images?.[0]?.image_url
    || v.VariationImages?.[0]?.image_url || v.images?.[0]?.image_url
    || it.image || it.image_url || '';
  return resolveImg(raw);
}

// Pull just the colour out of the variation attributes (skip the rest).
function pickColor(it) {
  const raw = it.variation?.attributes || it.ProductVariation?.attributes || it.attributes;
  if (!raw) return it.color || '';
  const a = typeof raw === 'string'
    ? (() => { try { return JSON.parse(raw); } catch { return {}; } })()
    : raw;
  const val = a.color || a.Color || a.colour || a.Colour || '';
  return Array.isArray(val) ? val.join(', ') : (val || '');
}

const fmtDate = (v) => {
  if (!v) return '';
  try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
};
const fmtDateTime = (v) => {
  if (!v) return '';
  try { return new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return ''; }
};

// Build a tracking timeline from courier history, falling back to order status history.
function getTimeline(data) {
  const fship = data?.fship_data?.tracking_history;
  if (Array.isArray(fship) && fship.length) {
    return [...fship].reverse().map((h) => ({
      status: h.status, note: h.location || h.description || '', time: h.timestamp || h.created_at || '',
    }));
  }
  const sh = data?.status_history;
  const finalStatus = String(data?.order?.status || '').toLowerCase();
  if (Array.isArray(sh) && sh.length) {
    const filtered = finalStatus !== 'cancelled' ? sh.filter((h) => h.status !== 'cancelled') : sh;
    return [...filtered].reverse()
      .map((h) => ({ status: h.status, note: h.notes || '', time: h.created_at || h.createdAt || '' }))
      .filter((i) => i.status);
  }
  return [];
}

export default function TrackOrderClient() {
  const [orderNumber, setOrderNumber] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runTrack = async (num) => {
    if (!num || !num.trim()) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await trackOrder(num.trim());
      // Backend wraps the payload: { success, data: { order, items, shipping_address, ... } }
      const payload = res && res.data ? res.data : res;
      setData(payload && payload.order ? payload : { order: payload });
    } catch {
      setError('Order not found. Please check the order number.');
      toast.error('Order not found. Please check the order number.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = (e) => { e.preventDefault(); runTrack(orderNumber); };

  // Support deep-links from the account pages: /track-order?order=ORD-...
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('order');
    if (q) { setOrderNumber(q); runTrack(q); }
  }, []);

  const order = data?.order || null;
  const items = data?.items || order?.OrderItems || order?.items || [];
  const tracking = data?.tracking || null;
  const addr = data?.shipping_address || order?.ShippingAddress || order?.shipping_address || null;
  const timeline = data ? getTimeline(data) : [];
  const status = (order?.status || '').toLowerCase();
  const currentStep = order ? STEPS.indexOf(status) : -1;
  const trackUrl = tracking?.tracking_url || order?.tracking_url;
  const awb = order?.tracking_number || tracking?.tracking_number;
  const placedAt = fmtDate(order?.created_at || order?.createdAt || order?.placed_at);

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="auth-wrap" style={{ maxWidth: 640 }}>
        <div className="page-hero" style={{ textAlign: 'center', margin: '0 auto 22px' }}>
          <span className="eyebrow">Track order</span>
          <h1>Track your order</h1>
          <p>Enter your order number to check delivery status.</p>
        </div>

        <form onSubmit={handleTrack} className="track-form">
          <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Order number (e.g. ORD-12345)" />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Icon name="Search" size={15} /> {loading ? 'Tracking…' : 'Track'}
          </button>
        </form>

        {error && <p className="auth-error" style={{ textAlign: 'center', marginTop: 14 }}>{error}</p>}

        {order && (
          <div className="track-card">
            <div className="track-head">
              <div>
                <span className="muted">Order number</span>
                <b>{order.order_number}</b>
                <div className="track-meta">
                  {placedAt && <span><Icon name="Clock" size={12} /> {placedAt}</span>}
                  <span><Icon name="ShoppingBag" size={12} /> {items.length} item{items.length !== 1 ? 's' : ''}</span>
                  {order.final_amount != null && <span>₹{Number(order.final_amount).toFixed(0)}</span>}
                </div>
              </div>
              <span className={`track-status track-status-${status}`}>{order.status}</span>
            </div>

            {status !== 'cancelled' && (
              <div className="track-steps">
                {STEPS.map((step, i) => (
                  <div key={step} className={`track-step${i <= currentStep ? ' done' : ''}`}>
                    <span className="track-dot">{i <= currentStep ? <Icon name="Check" size={13} /> : i + 1}</span>
                    <span className="track-step-label">{step}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Items with images */}
            {items.length > 0 && (
              <div className="track-items">
                {items.map((it, i) => {
                  const name = it.name || it.product?.name || it.Product?.name || it.product_name || 'Item';
                  const img = pickItemImage(it);
                  const qty = it.quantity || it.qty || 1;
                  const price = Number(it.total_price || (Number(it.price || it.unit_price || 0) * qty));
                  const sku = it.variation?.sku || it.ProductVariation?.sku;
                  const color = pickColor(it);
                  return (
                    <div className="order-item" key={i}>
                      <div className="order-item-thumb">
                        {img ? <ShimmerImg src={img} alt={name} /> : <Icon name="Footprints" size={22} color="#c3ccd2" />}
                      </div>
                      <div className="order-item-info">
                        <b>{name}</b>
                        {sku && <span className="muted">SKU {String(sku).replace(/^\s*SKU\s*[:·-]\s*/i, '')}</span>}
                        {color && <span className="muted">Color: {color}</span>}
                        <span className="muted">Qty {qty}</span>
                      </div>
                      {price > 0 && <b>₹{price.toFixed(0)}</b>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tracking timeline */}
            {timeline.length > 0 && (
              <ol className="track-timeline">
                {timeline.map((ev, i) => (
                  <li key={i} className={i === 0 ? 'first' : ''}>
                    <span className="tl-status">{String(ev.status).replace(/_/g, ' ')}</span>
                    {ev.note && <span className="tl-note">{ev.note}</span>}
                    {ev.time && <span className="tl-time"><Icon name="Clock" size={11} /> {fmtDateTime(ev.time)}</span>}
                  </li>
                ))}
              </ol>
            )}

            <div className="track-details">
              {order.final_amount != null && (
                <div className="row"><span className="muted">Total</span><b>₹{Number(order.final_amount).toFixed(0)}</b></div>
              )}
              {order.payment_type && (
                <div className="row"><span className="muted">Payment</span><b>{order.payment_type === 'cod' ? 'Cash on Delivery' : (order.payment_type || '').toUpperCase()}</b></div>
              )}
              {awb && (
                <div className="row"><span className="muted">AWB</span><b>{awb}</b></div>
              )}
            </div>

            {/* Delivery address */}
            {addr && (
              <div className="order-address">
                <span className="muted"><Icon name="MapPin" size={13} /> Delivery to</span>
                <p>
                  {(addr.full_name || addr.fullName) && <><b>{addr.full_name || addr.fullName}</b><br /></>}
                  {addr.address}, {addr.city}, {addr.state} {addr.pincode || addr.postal_code}
                  {(addr.phone || addr.phone_number) && <><br /><span className="muted">{addr.phone || addr.phone_number}</span></>}
                </p>
              </div>
            )}

            {trackUrl && (
              <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%', marginTop: 14 }}>
                <Icon name="Truck" size={15} /> Live courier tracking
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
