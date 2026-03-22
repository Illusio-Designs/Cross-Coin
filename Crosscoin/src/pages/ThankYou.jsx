import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { getGuestOrder, getUserOrders } from "../services/publicApi";
import { useAuth } from "../context/AuthContext";
import { fbqTrack } from "../utils/fbqTrack";

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconPackage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconShoppingBag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);
const IconMapPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

export default function ThankYou() {
  const router = useRouter();
  const { order_number, guest_email, is_guest } = router.query;
  const { isAuthenticated } = useAuth();
  const [showGuestTracking, setShowGuestTracking] = useState(false);
  const [guestEmail, setGuestEmail] = useState(guest_email || "");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const getDeliveryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleTrackOrder = () => {
    if (is_guest === 'true') {
      setShowGuestTracking(true);
    } else {
      router.push('/profile');
    }
  };

  const handleGuestTrackOrder = async () => {
    if (!guestEmail || !order_number) return;
    setTrackingLoading(true);
    try {
      const result = await getGuestOrder(guestEmail, order_number);
      setTrackingResult(result);
    } catch (error) {
      setTrackingResult({ success: false, message: error.message || 'Failed to track order' });
    } finally {
      setTrackingLoading(false);
    }
  };

  // Facebook Purchase tracking
  useEffect(() => {
    const trackPurchaseEvent = async () => {
      const trackingKey = `fb_purchase_tracked_${order_number}`;
      if (!order_number || sessionStorage.getItem(trackingKey)) return;

      const waitForFbq = (maxAttempts = 10) => new Promise(resolve => {
        let attempts = 0;
        const check = () => {
          if (typeof window !== 'undefined' && window.fbq) return resolve(true);
          if (attempts++ < maxAttempts) setTimeout(check, 200);
          else resolve(false);
        };
        check();
      });

      try {
        const fbqReady = await waitForFbq();
        if (!fbqReady) return;

        let orderData = null;
        if (is_guest === 'true' && guest_email) {
          const result = await getGuestOrder(guest_email, order_number);
          if (result.success && result.data) orderData = result.data;
        } else if (isAuthenticated) {
          const result = await getUserOrders({ limit: 100 });
          if (result.orders) {
            const order = result.orders.find(o => String(o.order_number) === String(order_number));
            if (order) orderData = { order: { final_amount: order.final_amount }, items: (order.OrderItems || []).map(i => ({ product: { id: i.Product?.id || i.product_id }, quantity: i.quantity || 1 })) };
          }
        }

        if (orderData?.order && orderData?.items?.length > 0) {
          const purchaseData = { value: parseFloat(orderData.order.final_amount) || 0, currency: 'INR', content_type: 'product', contents: orderData.items.filter(i => i.product?.id).map(i => ({ id: String(i.product.id), quantity: i.quantity || 1 })) };
          if (purchaseData.value > 0) {
            fbqTrack('Purchase', purchaseData, { eventID: `Purchase_${order_number}` });
            sessionStorage.setItem(trackingKey, 'true');
          }
        }
      } catch (_) {}
    };

    if (router.isReady && order_number) {
      const t = setTimeout(trackPurchaseEvent, 500);
      return () => clearTimeout(t);
    }
  }, [router.isReady, order_number, is_guest, guest_email, isAuthenticated]);

  return (
    <div className="ty-page">
      <div className="ty-card">
        {/* Success icon */}
        <div className="ty-icon-wrap">
          <div className="ty-icon">
            <IconCheck />
          </div>
        </div>

        <h1 className="ty-title">Order Confirmed!</h1>
        {order_number && (
          <p className="ty-order-num">Order <span>#{order_number}</span></p>
        )}

        {/* Info strips */}
        <div className="ty-info-strips">
          <div className="ty-strip">
            <span className="ty-strip-icon"><IconMail /></span>
            <span>
              {is_guest === 'true'
                ? <>Confirmation sent to <strong>{guest_email}</strong></>
                : 'Confirmation sent to your registered email'
              }
            </span>
          </div>
          <div className="ty-strip">
            <span className="ty-strip-icon"><IconPackage /></span>
            <span>Estimated delivery by <strong>{getDeliveryDate()}</strong></span>
          </div>
        </div>

        {/* Guest tracking form */}
        {showGuestTracking && (
          <div className="ty-tracking-form">
            <p className="ty-tracking-title">Track Your Order</p>
            <input
              className="ty-input"
              type="email"
              value={guestEmail}
              onChange={e => setGuestEmail(e.target.value)}
              placeholder="Enter your email address"
            />
            <div className="ty-tracking-actions">
              <button className="ty-btn-primary" onClick={handleGuestTrackOrder} disabled={trackingLoading}>
                {trackingLoading ? 'Tracking...' : 'Track Order'}
              </button>
              <button className="ty-btn-ghost" onClick={() => setShowGuestTracking(false)}>Cancel</button>
            </div>

            {trackingResult && (
              <div className={`ty-tracking-result ${trackingResult.success ? 'success' : 'error'}`}>
                {trackingResult.success ? (
                  <>
                    <p><strong>Status:</strong> {trackingResult.data?.status || 'Processing'}</p>
                    <p><strong>Order Date:</strong> {trackingResult.data?.created_at ? new Date(trackingResult.data.created_at).toLocaleDateString('en-IN') : '—'}</p>
                    {trackingResult.data?.tracking_info && <p><strong>Tracking:</strong> {trackingResult.data.tracking_info}</p>}
                  </>
                ) : (
                  <p>{trackingResult.message}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* CTA buttons */}
        <div className="ty-actions">
          <button className="ty-btn-primary" onClick={() => router.push('/Products')}>
            <span className="ty-btn-icon"><IconShoppingBag /></span>
            Continue Shopping
          </button>
          <button className="ty-btn-outline" onClick={handleTrackOrder}>
            <span className="ty-btn-icon"><IconMapPin /></span>
            Track Your Order
          </button>
        </div>
      </div>
    </div>
  );
}
