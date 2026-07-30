'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import ShimmerImg from '@/components/ui/ShimmerImg';
import { trackOrder } from '@/lib/api/orders';
import { API_URL } from '@/lib/api/client';
import { toast } from '@/lib/toast';

const STEPS = ['confirmed', 'processing', 'shipped', 'delivered'];

// Item images arrive host-relative from the backend — prefix the API host
// (same resolution Crosscoin's order-tracking page uses).
function resolveImg(raw) {
  if (!raw || typeof raw !== 'string') return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `${API_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
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
      // Backend returns { order, items, tracking }
      setData(res && res.order ? res : { order: res });
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
  const status = (order?.status || '').toLowerCase();
  const currentStep = order ? STEPS.indexOf(status) : -1;
  const trackUrl = tracking?.tracking_url || order?.tracking_url;

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="auth-wrap" style={{ maxWidth: 620 }}>
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
              <div><span className="muted">Order number</span><b>{order.order_number}</b></div>
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

            {/* Items with images — like Crosscoin's tracking page */}
            {items.length > 0 && (
              <div className="track-items">
                {items.map((it, i) => {
                  const name = it.name || it.product?.name || it.Product?.name || it.product_name || 'Item';
                  const img = resolveImg(it.image || it.product?.image || it.Product?.image || it.image_url || '');
                  const qty = it.quantity || it.qty || 1;
                  const price = Number(it.price || it.unit_price || 0);
                  return (
                    <div className="order-item" key={i}>
                      <div className="order-item-thumb">
                        {img ? <ShimmerImg src={img} alt={name} /> : <Icon name="Footprints" size={22} color="#c3ccd2" />}
                      </div>
                      <div className="order-item-info"><b>{name}</b>{it.size && <span className="muted">Size {it.size}</span>}<span className="muted">Qty {qty}</span></div>
                      {price > 0 && <b>₹{(price * qty).toFixed(0)}</b>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="track-details">
              {order.final_amount != null && (
                <div className="row"><span className="muted">Total</span><b>₹{Number(order.final_amount).toFixed(0)}</b></div>
              )}
              {order.payment_type && (
                <div className="row"><span className="muted">Payment</span><b style={{ textTransform: 'uppercase' }}>{order.payment_type}</b></div>
              )}
              {(order.tracking_number || tracking?.tracking_number) && (
                <div className="row"><span className="muted">AWB</span><b>{order.tracking_number || tracking.tracking_number}</b></div>
              )}
            </div>

            {trackUrl && (
              <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%', marginTop: 14 }}>
                Live courier tracking <Icon name="ArrowRight" size={15} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
