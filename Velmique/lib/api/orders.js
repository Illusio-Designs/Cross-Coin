/* Velmique orders / checkout / payments client.
   Same endpoints + payload shapes as Knitwink — brand=velmique. */

import { getAuthToken as getToken, setAuthToken } from '@/lib/authToken';

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
    headers: publicHeaders(),
    body: JSON.stringify(orderData),
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
    body: JSON.stringify(checkoutData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Checkout failed');
  return data;
}

export async function initiateGuestCheckout(checkoutData) {
  const res = await fetch(`${API_URL}/api/checkout/guest/initiate`, {
    method: 'POST',
    headers: publicHeaders(),
    body: JSON.stringify(checkoutData),
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
  return Array.isArray(data) ? data : (data?.fees || data?.shippingFees || []);
}

export async function checkPincodeServiceability(pincode) {
  try {
    const res = await fetch(`${API_URL}/api/serviceability/${pincode}`, { headers: publicHeaders() });
    if (!res.ok) return { serviceable: true, cod_allowed: true };
    const data = await res.json();
    return {
      serviceable: data.serviceable !== false,
      cod_allowed: data.cod_allowed !== false && data.cod_available !== false,
      estimated_delivery_days: data.estimated_delivery_days || 5,
      city:  data.city  || '',
      state: data.state || '',
    };
  } catch {
    return { serviceable: true, cod_allowed: true };
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

/* Aliases for compatibility with the CartDrawer port */
export { verifyPayment as updateOrderPayment };
