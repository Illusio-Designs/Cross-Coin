/* Gripzus — orders API. Same endpoints as Knitwink, gripzus brand. */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

function headers(token) {
  const h = { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

// Get the logged-in user's orders
export async function getUserOrders(params = {}) {
  const token = getToken();
  const qp = new URLSearchParams();
  if (params.status) qp.append('status', params.status);
  if (params.page)   qp.append('page', params.page);
  if (params.limit)  qp.append('limit', params.limit);
  const res = await fetch(`${API_URL}/api/orders/my-orders?${qp.toString()}`, { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

// Cancel an order
export async function cancelOrder(orderId, reason = '') {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Cancellation failed');
  return data;
}

// Track an order by order number (public)
export async function trackOrder(orderNumber) {
  const res = await fetch(`${API_URL}/api/orders/track/${encodeURIComponent(orderNumber)}`, {
    headers: { 'X-Brand-Name': BRAND },
  });
  if (!res.ok) throw new Error('Order not found');
  return res.json();
}

export const getOrders = getUserOrders;

/* ── Order creation ──────────────────────────────────────────────── */

export async function createOrder(orderData) {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: headers(getToken()),
    body: JSON.stringify(orderData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Order creation failed');
  return data;
}

export async function createGuestOrder(orderData) {
  const res = await fetch(`${API_URL}/api/orders/guest-checkout`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(orderData),
  });
  const data = await res.json();
  // Backend auto-creates an account for the guest — capture the token.
  const newToken = res.headers.get('x-auth-token');
  if (newToken && typeof window !== 'undefined') {
    localStorage.setItem('token', newToken);
    window.dispatchEvent(new Event('storage'));
  }
  if (!res.ok) throw new Error(data.message || 'Order creation failed');
  return data;
}

/* ── Checkout (prepaid / Razorpay) ───────────────────────────────── */

export async function initiateCheckout(checkoutData) {
  const res = await fetch(`${API_URL}/api/checkout/initiate`, {
    method: 'POST',
    headers: headers(getToken()),
    body: JSON.stringify(checkoutData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Checkout failed');
  return data;
}

export async function initiateGuestCheckout(checkoutData) {
  const res = await fetch(`${API_URL}/api/checkout/guest/initiate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(checkoutData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Checkout failed');
  return data;
}

export async function retryCheckout(reservationId) {
  const res = await fetch(`${API_URL}/api/checkout/retry`, {
    method: 'POST',
    headers: headers(getToken()),
    body: JSON.stringify({ reservation_id: reservationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Retry failed');
  return data;
}

export async function verifyPayment({ orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id }) {
  const res = await fetch(`${API_URL}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Payment verification failed');
  return data;
}

/* ── Shipping fees ───────────────────────────────────────────────── */

export async function getShippingFees() {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/shipping-fees`, {
    headers: token ? headers(token) : { 'X-Brand-Name': BRAND },
  });
  if (!res.ok) return [];
  return res.json();
}

/* ── Shipping addresses ──────────────────────────────────────────── */

export async function getUserAddresses() {
  const res = await fetch(`${API_URL}/api/shipping-addresses`, { headers: headers(getToken()) });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data?.shippingAddresses || data?.addresses || [];
}

function normaliseAddr(data) {
  return {
    full_name:    data.full_name || data.fullName || '',
    address:      data.address || '',
    city:         data.city || '',
    state:        data.state || '',
    postal_code:  data.postal_code || data.postalCode || data.pincode || '',
    country:      data.country || 'India',
    phone_number: data.phone_number || data.phoneNumber || data.phone || '',
    is_default:   data.is_default ?? data.isDefault ?? false,
  };
}

export async function createShippingAddress(data) {
  const res = await fetch(`${API_URL}/api/shipping-addresses`, {
    method: 'POST',
    headers: headers(getToken()),
    body: JSON.stringify(normaliseAddr(data)),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || 'Failed to create address');
  return result;
}

export async function updateShippingAddress(id, data) {
  const res = await fetch(`${API_URL}/api/shipping-addresses/${id}`, {
    method: 'PUT',
    headers: headers(getToken()),
    body: JSON.stringify(normaliseAddr(data)),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || 'Failed to update address');
  return result;
}

/* ── Serviceability & coupons ────────────────────────────────────── */

export async function checkPincodeServiceability(pincode) {
  const res = await fetch(`${API_URL}/api/serviceability/${pincode}`, {
    headers: { 'X-Brand-Name': BRAND },
  });
  if (!res.ok) return { serviceable: true, cod_allowed: true };
  const data = await res.json();
  return {
    serviceable: data.serviceable !== false,
    cod_allowed: data.cod_allowed !== false || data.cod_available !== false,
    estimated_delivery_days: data.estimated_delivery_days || 5,
  };
}

export async function validateCoupon({ code, cartTotal, paymentMode, cartItems }) {
  const res = await fetch(`${API_URL}/api/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
    body: JSON.stringify({ code, cartTotal, paymentMode, cartItems }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Invalid coupon');
  return data;
}
