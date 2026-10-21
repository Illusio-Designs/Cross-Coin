/* Velmique orders / checkout / payments client.
   Same endpoints + payload shapes as Knitwink — brand=velmique. */

import { getAuthToken as getToken, setAuthToken } from '@/lib/authToken';
import { trackingIds } from '@/utils/pixel';

const API_URL = process.env.NEXT_PUBLIC_API_URL    ?? 'https://api.crosscoin.in';
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'X-Brand-Name': BRAND,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function publicHeaders() {
  return { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND };
}

/* ────── Orders ─────────────────────────────────────────────────────────── */

export async function getUserOrders({ limit = 20, page = 1, status } = {}) {
  const qp = new URLSearchParams();
  if (limit)  qp.append('limit', limit);
  if (page)   qp.append('page', page);
  if (status) qp.append('status', status);
  const res = await fetch(`${API_URL}/api/orders/my-orders?${qp.toString()}`, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to load orders');
  return Array.isArray(data) ? data : (data.orders || data.data || []);
}

// Read a first-party cookie by name (set on this storefront's own domain).
function readCookie(name) {
  try {
    const m = document.cookie.match('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1') + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

// Attach first-party tracking ids to an order/checkout payload so the backend
// can (a) link the order to the visit's traffic source via utm_session_id and
// (b) improve Meta match quality with the Facebook browser id (_fbp) and click
// id (_fbc), plus the GA4 client id (ga_client_id). _fbc is reconstructed from
// a stored fbclid when the cookie is absent. All best-effort — never blocks checkout.
function withTracking(data) {
  const out = { ...(data || {}) };
  try {
    if (typeof window !== 'undefined') {
      const sid = localStorage.getItem('utm_session_id');
      if (sid && !out.utm_session_id) out.utm_session_id = sid;
      const fbp = readCookie('_fbp');
      if (fbp && !out.fbp) out.fbp = fbp;
      let fbc = readCookie('_fbc');
      if (!fbc) {
        const clid = localStorage.getItem('fbclid');
        if (clid) fbc = 'fb.1.' + Date.now() + '.' + clid;
      }
      if (fbc && !out.fbc) out.fbc = fbc;
      // Also the cookie ids the pixel helper reads (adds the GA4 client id).
      const ids = trackingIds();
      for (const k of Object.keys(ids)) if (ids[k] && !out[k]) out[k] = ids[k];
    }
  } catch { /* ignore */ }
  return out;
}

export async function createOrder(orderData) {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(withTracking(orderData)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Order creation failed');
  return data;
}

export async function createGuestOrder(orderData) {
  const res = await fetch(`${API_URL}/api/orders/guest-checkout`, {
    method: 'POST',
    headers: publicHeaders(),
    body: JSON.stringify(withTracking(orderData)),
  });
  const data = await res.json().catch(() => ({}));
  // Backend issues a token for the auto-created user via the x-auth-token
  // response header — store it so subsequent requests run as that user.
  const newToken = res.headers.get('x-auth-token');
  if (newToken) {
    setAuthToken(newToken);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
  }
  if (!res.ok) throw new Error(data.message || 'Order creation failed');
  return data;
}

export async function cancelOrder(orderId, reason = '') {
  const res = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to cancel order');
  return data;
}

export async function trackOrder(orderNumber) {
  const res = await fetch(`${API_URL}/api/orders/track/${encodeURIComponent(orderNumber)}`, {
    headers: { 'X-Brand-Name': BRAND },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Order not found');
  return data;
}

/* ────── Checkout (prepaid — payment-first) ─────────────────────────────── */

export async function initiateCheckout(checkoutData) {
  const res = await fetch(`${API_URL}/api/checkout/initiate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(withTracking(checkoutData)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Checkout failed');
  return data;
}

export async function initiateGuestCheckout(checkoutData) {
  const res = await fetch(`${API_URL}/api/checkout/guest/initiate`, {
    method: 'POST',
    headers: publicHeaders(),
    body: JSON.stringify(withTracking(checkoutData)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Checkout failed');
  return data;
}

export async function retryCheckout(reservationId) {
  const res = await fetch(`${API_URL}/api/checkout/retry`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reservation_id: reservationId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Retry failed');
  return data;
}

/* ────── Razorpay verification ──────────────────────────────────────────── */

export async function verifyPayment({ orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id }) {
  const res = await fetch(`${API_URL}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: publicHeaders(),
    body: JSON.stringify({ orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Payment verification failed');
  return data;
}

/* ────── Shipping fees + serviceability ─────────────────────────────────── */

export async function getShippingFees() {
  const res = await fetch(`${API_URL}/api/shipping-fees`, {
    headers: getToken() ? authHeaders() : publicHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ([]));
  const fees = Array.isArray(data) ? data : (data?.fees || data?.shippingFees || []);
  // Preserve the array shape existing callers rely on (.length / .find) while
  // surfacing the free-shipping threshold from object-shaped responses so the
  // cart drawer can read it off the returned value.
  if (!Array.isArray(data) && data && data.freeShippingThreshold != null) {
    fees.freeShippingThreshold = data.freeShippingThreshold;
  }
  return fees;
}

export async function checkPincodeServiceability(pincode) {
  try {
    const res = await fetch(`${API_URL}/api/serviceability/${pincode}`, { headers: publicHeaders() });
    if (!res.ok) return { serviceable: true, cod_allowed: true, city: null, state: null };
    const data = await res.json();
    return {
      serviceable: data.serviceable !== false,
      cod_allowed: data.cod_allowed !== false && data.cod_available !== false,
      estimated_delivery_days: data.estimated_delivery_days || 5,
      city:  data.city  ?? null,
      state: data.state ?? null,
    };
  } catch {
    return { serviceable: true, cod_allowed: true, city: null, state: null };
  }
}

/* ────── Coupons ────────────────────────────────────────────────────────── */

export async function getPublicCoupons() {
  try {
    const res = await fetch(`${API_URL}/api/coupons/listing`, { headers: publicHeaders() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data) ? data : (data?.coupons || []);
  } catch {
    return [];
  }
}

export async function validateCoupon({ code, cartTotal, paymentMode, cartItems }) {
  const res = await fetch(`${API_URL}/api/coupons/validate`, {
    method: 'POST',
    headers: publicHeaders(),
    body: JSON.stringify({ code, cartTotal, paymentMode, cartItems }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Invalid coupon');
  return data;
}

/* ────── Abandoned-cart capture (WhatsApp recovery) ─────────────────────── */
// Record the shopper's in-progress checkout (phone + cart summary) so the
// backend can message them on WhatsApp if they don't complete. Best-effort +
// keepalive so it still lands if they close the tab. Brand comes from the
// X-Brand-Name header (authHeaders), and the bearer token rides along when the
// shopper is logged in. Never throws — must not block checkout.
export async function captureAbandonedCart(payload) {
  try {
    await fetch(`${API_URL}/api/abandoned-cart`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (_) { /* best-effort, never block checkout */ }
}

/* Aliases for compatibility with the CartDrawer port */
export { verifyPayment as updateOrderPayment };

/* ────── Returns & refunds ──────────────────────────────────────────────── */
export async function createReturn(formData) {
  const token = getToken();
  const headers = { 'X-Brand-Name': BRAND, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${API_URL}/api/returns`, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Return request failed');
  return data;
}

export async function getMyReturns() {
  const res = await fetch(`${API_URL}/api/returns/my`, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to load returns');
  return data;
}

// Back from the custom-checkout provider's page: our backend confirms the
// order with the provider, saves it, and (with marketing consent) sends Meta
// the server Purchase with this shopper's browser ids. Returns our order
// number + contents for the matching browser Purchase.
export async function confirmCheckoutReturn(oid) {
  const res = await fetch(`${API_URL}/api/custom-checkout/confirm`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
    body: JSON.stringify(withTracking({ oid })),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.message || 'Could not confirm the order');
  return data;
}
