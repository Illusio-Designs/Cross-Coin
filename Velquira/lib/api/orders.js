import { apiClient } from '@/lib/api/client'

// Get user's orders
export async function getUserOrders(params = {}) {
  const qp = new URLSearchParams()
  if (params.status) qp.append('status', params.status)
  if (params.page) qp.append('page', params.page)
  if (params.limit) qp.append('limit', params.limit)
  return apiClient.get(`/api/orders/my-orders?${qp.toString()}`)
}

// Create order (logged-in user)
export async function createOrder(orderData) {
  return apiClient.post('/api/orders', orderData)
}

/**
 * Guest order — the backend may stamp a freshly minted user token on the
 * response header (`x-auth-token`) so the guest is silently signed in.
 * apiClient doesn't surface raw response headers, so we use raw fetch
 * for this specific call to capture the header. All hardening (timeout,
 * brand header, auth) is replicated inline.
 */
export async function createGuestOrder(orderData) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
  const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velquira'
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 30_000)
  let res
  try {
    res = await fetch(`${API_URL}/api/orders/guest-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
      body: JSON.stringify(orderData),
      signal: ac.signal,
    })
  } finally { clearTimeout(timer) }
  const data = await res.json()
  const newToken = res.headers.get('x-auth-token')
  if (newToken && typeof window !== 'undefined') {
    try {
      localStorage.setItem('token', newToken)
      window.dispatchEvent(new Event('storage'))
    } catch { /* ignore */ }
  }
  if (!res.ok) throw new Error(data.message || 'Order creation failed')
  return data
}

// Track order by order number (public)
export async function trackOrder(orderNumber) {
  return apiClient.get(`/api/orders/track/${encodeURIComponent(orderNumber)}`)
}

// Cancel order
export async function cancelOrder(orderId, reason = '') {
  return apiClient.put(`/api/orders/${orderId}/cancel`, { reason })
}

// Initiate checkout (prepaid, logged-in)
export async function initiateCheckout(checkoutData) {
  return apiClient.post('/api/checkout/initiate', checkoutData)
}

// Initiate guest checkout (prepaid, no auth)
export async function initiateGuestCheckout(checkoutData) {
  return apiClient.post('/api/checkout/guest/initiate', checkoutData)
}

// Create Razorpay order
export async function createRazorpayOrder({ amount, currency = 'INR', receipt, isGuest = false }) {
  const endpoint = isGuest ? '/api/payments/guest/razorpay/order' : '/api/payments/razorpay/order'
  const data = await apiClient.post(endpoint, { amount, currency, receipt })
  return data.order
}

// Verify Razorpay payment
export async function verifyPayment({ orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id }) {
  return apiClient.post('/api/payments/razorpay/verify', { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id })
}

// Get shipping fees
export async function getShippingFees() {
  try { return await apiClient.get('/api/shipping-fees', { suppressErrorToast: true }) }
  catch { return [] }
}

// Shipping addresses
export async function getUserAddresses() {
  try {
    const data = await apiClient.get('/api/shipping-addresses', { suppressErrorToast: true })
    return Array.isArray(data) ? data : data?.shippingAddresses || data?.addresses || []
  } catch { return [] }
}

export async function createAddress(data) {
  return apiClient.post('/api/shipping-addresses', data)
}

function normaliseAddr(data) {
  return {
    full_name: data.full_name || data.fullName || '',
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    postal_code: data.postal_code || data.postalCode || data.pincode || '',
    country: data.country || 'India',
    phone_number: data.phone_number || data.phoneNumber || data.phone || '',
    is_default: data.is_default ?? data.isDefault ?? false,
  }
}

export async function createShippingAddress(data) {
  return apiClient.post('/api/shipping-addresses', normaliseAddr(data))
}

export async function updateShippingAddress(id, data) {
  return apiClient.put(`/api/shipping-addresses/${id}`, normaliseAddr(data))
}

// Retry checkout — extends stock reservation & gets a new Razorpay order
export async function retryCheckout(reservationId) {
  return apiClient.post('/api/checkout/retry', { reservation_id: reservationId })
}

// Check if a pincode is serviceable
export async function checkPincodeServiceability(pincode) {
  try {
    const data = await apiClient.get(`/api/serviceability/${pincode}`, { suppressErrorToast: true })
    return {
      serviceable: data.serviceable !== false,
      cod_allowed: data.cod_allowed !== false || data.cod_available !== false,
      estimated_delivery_days: data.estimated_delivery_days || 5,
    }
  } catch {
    return { serviceable: true, cod_allowed: true }
  }
}

// Validate a coupon code
export async function validateCoupon({ code, cartTotal, paymentMode, cartItems }) {
  return apiClient.post('/api/coupons/validate', { code, cartTotal, paymentMode, cartItems })
}

// Alias for CartDrawer compatibility
export { verifyPayment as updateOrderPayment }

// Aliases for backward compatibility
export const getOrders = getUserOrders
export const getOrder = (id) => apiClient.get(`/api/orders/${id}`)
