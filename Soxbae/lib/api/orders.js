/* Orders / checkout / payments API — mirrors Knitwink/lib/api/orders.js.
 *
 * Covers the full purchase flow against the Cross-Coin backend:
 *   - COD orders:      POST /api/orders            (auth)
 *                      POST /api/orders/guest-checkout (guest)
 *   - Prepaid:         POST /api/checkout/initiate       (auth)
 *                      POST /api/checkout/guest/initiate (guest)
 *                      POST /api/checkout/retry
 *                      POST /api/payments/razorpay/verify
 *   - Order history:   GET  /api/orders/my-orders, /api/orders/:id
 *   - Tracking:        GET  /api/orders/track/:orderNumber (public)
 *   - Cancellation:    PUT  /api/orders/:id/cancel
 *   - Shipping fees:   GET  /api/shipping-fees
 *   - Serviceability:  GET  /api/serviceability/:pincode
 *   - Coupons:         POST /api/coupons/validate
 */
import { API_URL, BRAND, authHeaders, getToken, setToken } from './client';

// ── Order history ──────────────────────────────────────────────────────────
export async function getUserOrders(params = {}) {
  const qp = new URLSearchParams();
  if (params.status) qp.append('status', params.status);
  if (params.page) qp.append('page', params.page);
  if (params.limit) qp.append('limit', params.limit);
  const res = await fetch(`${API_URL}/api/orders/my-orders?${qp.toString()}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function getOrder(id) {
  const res = await fetch(`${API_URL}/api/orders/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Order not found');
  return res.json();
}

// ── COD orders ─────────────────────────────────────────────────────────────
export async function createOrder(orderData) {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(orderData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Order creation failed');
  return data;
}

export async function createGuestOrder(orderData) {
  const res = await fetch(`${API_URL}/api/orders/guest-checkout`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(orderData),
  });
  const data = await res.json().catch(() => ({}));
  // Guest checkout auto-creates a user and returns a session token.
  const newToken = res.headers.get('x-auth-token');
  if (newToken) setToken(newToken);
  if (!res.ok) throw new Error(data.message || 'Order creation failed');
  return data;
}

// ── Order tracking (public) ────────────────────────────────────────────────
export async function trackOrder(orderNumber) {
  const res = await fetch(`${API_URL}/api/orders/track/${encodeURIComponent(orderNumber)}`, {
    headers: { 'X-Brand-Name': BRAND },
  });
  if (!res.ok) throw new Error('Order not found');
  return res.json();
}

// ── Cancellation ───────────────────────────────────────────────────────────
export async function cancelOrder(orderId, reason = '') {
  const res = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Cancellation failed');
  return data;
}

// ── Prepaid checkout initiation ────────────────────────────────────────────
export async function initiateCheckout(checkoutData) {
  const res = await fetch(`${API_URL}/api/checkout/initiate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(checkoutData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Checkout failed');
  return data;
}

export async function initiateGuestCheckout(checkoutData) {
  const res = await fetch(`${API_URL}/api/checkout/guest/initiate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(checkoutData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Checkout failed');
  return data;
}

// Retry checkout — extends stock reservation & returns a fresh Razorpay order.
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

// ── Razorpay ───────────────────────────────────────────────────────────────
export async function createRazorpayOrder({ amount, currency = 'INR', receipt, isGuest = false }) {
  const endpoint = isGuest ? '/api/payments/guest/razorpay/order' : '/api/payments/razorpay/order';
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ amount, currency, receipt }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Payment order failed');
  return data.order;
}

export async function verifyPayment({ orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id }) {
  const res = await fetch(`${API_URL}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Payment verification failed');
  return data;
}

// ── Shipping fees ──────────────────────────────────────────────────────────
export async function getShippingFees() {
  const res = await fetch(`${API_URL}/api/shipping-fees`, {
    headers: getToken() ? authHeaders() : { 'X-Brand-Name': BRAND },
  });
  if (!res.ok) return [];
  return res.json();
}

// ── Serviceability ─────────────────────────────────────────────────────────
export async function checkPincodeServiceability(pincode) {
  try {
    const res = await fetch(`${API_URL}/api/serviceability/${pincode}`, {
      headers: { 'X-Brand-Name': BRAND },
    });
    if (!res.ok) return { serviceable: true, cod_allowed: true };
    const data = await res.json();
    return {
      serviceable: data.serviceable !== false,
      cod_allowed: data.cod_allowed !== false && data.cod_available !== false,
      estimated_delivery_days: data.estimated_delivery_days || 5,
      city: data.city,
      state: data.state,
    };
  } catch {
    return { serviceable: true, cod_allowed: true };
  }
}

// ── Coupons ────────────────────────────────────────────────────────────────
export async function validateCoupon({ code, cartTotal, paymentMode, cartItems }) {
  const res = await fetch(`${API_URL}/api/coupons/validate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code, cartTotal, paymentMode, cartItems }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Invalid coupon');
  return data;
}

// Public list of active coupons for the current brand — used to surface
// tap-to-apply offers in the cart drawer. Uses the same base URL + brand
// header (via authHeaders) as validateCoupon. Returns [] on any failure so
// the UI can simply render nothing.
export async function getPublicCoupons() {
  try {
    const res = await fetch(`${API_URL}/api/coupons/listing`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.coupons) ? data.coupons : [];
  } catch {
    return [];
  }
}

// Aliases for backward-compat with Knitwink naming.
export const getOrders = getUserOrders;
export const updateOrderPayment = verifyPayment;
