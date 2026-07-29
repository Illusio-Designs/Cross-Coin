'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import { trackOrder } from '@/lib/api/orders';
import { toast } from '@/lib/toast';

const STEPS = ['confirmed', 'processing', 'shipped', 'delivered'];

export default function TrackOrderClient() {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const data = await trackOrder(orderNumber.trim());
      setOrder(data.order || data);
    } catch {
      setError('Order not found. Please check the order number.');
      toast.error('Order not found. Please check the order number.');
    } finally {
      setLoading(false);
    }
  };

  const status = (order?.status || '').toLowerCase();
  const currentStep = order ? STEPS.indexOf(status) : -1;

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="auth-wrap" style={{ maxWidth: 560 }}>
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

            <div className="track-details">
              {order.final_amount != null && (
                <div className="row"><span className="muted">Total</span><b>₹{Number(order.final_amount).toFixed(0)}</b></div>
              )}
              {order.payment_type && (
                <div className="row"><span className="muted">Payment</span><b style={{ textTransform: 'uppercase' }}>{order.payment_type}</b></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
