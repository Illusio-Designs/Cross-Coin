const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND = 'knitwink'

function headers(token) {
  const h = { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

// Get user's orders
export async function getUserOrders(params = {}) {
  const token = getToken()
  const qp = new URLSearchParams()
  if (params.status) qp.append('status', params.status)
  if (params.page) qp.append('page', params.page)
  if (params.limit) qp.append('limit', params.limit)
  const res = await fetch(`${API_URL}/api/orders/my-orders?${qp.toString()}`, { headers: headers(token) })
  if (!res.ok) throw new Error('Failed to fetch orders')
  return res.json()
}

// Create order (logged-in user)
export async function createOrder(orderData) {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(orderData),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Order creation failed')
  return data
}

// Create guest order
export async function createGuestOrder(orderData) {
  const res = await fetch(`${API_URL}/api/orders/guest-checkout`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(orderData),
  })
  const data = await res.json()
  // Store auto-created user token
  const newToken = res.headers.get('x-auth-token')
  if (newToken) {
    localStorage.setItem('token', newToken)
    window.dispatchEvent(new Event('storage'))
  }
  if (!res.ok) throw new Error(data.message || 'Order creation failed')
  return data
}

// Track order by order number (public)
export async function trackOrder(orderNumber) {
  const res = await fetch(`${API_URL}/api/orders/track/${encodeURIComponent(orderNumber)}`, {
    headers: { 'X-Brand-Name': BRAND },
  })
  if (!res.ok) throw new Error('Order not found')
  return res.json()
}

// Cancel order
export async function cancelOrder(orderId, reason = '') {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({ reason }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Cancellation failed')
  return data
}

// Initiate checkout (prepaid, logged-in)
export async function initiateCheckout(checkoutData) {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/checkout/initiate`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(checkoutData),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Checkout failed')
  return data
}

// Initiate guest checkout (prepaid, no auth)
export async function initiateGuestCheckout(checkoutData) {
  const res = await fetch(`${API_URL}/api/checkout/guest/initiate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(checkoutData),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Checkout failed')
  return data
}

// Create Razorpay order
export async function createRazorpayOrder({ amount, currency = 'INR', receipt, isGuest = false }) {
  const endpoint = isGuest ? '/api/payments/guest/razorpay/order' : '/api/payments/razorpay/order'
  const token = getToken()
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: isGuest ? headers() : headers(token),
    body: JSON.stringify({ amount, currency, receipt }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Payment order failed')
  return data.order
}

// Verify Razorpay payment
export async function verifyPayment({ orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id }) {
  const res = await fetch(`${API_URL}/api/payments/razorpay/verify`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Payment verification failed')
  return data
}

// Get shipping fees
export async function getShippingFees() {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/shipping-fees`, {
    headers: token ? headers(token) : { 'X-Brand-Name': BRAND },
  })
  if (!res.ok) return []
  return res.json()
}

// Shipping addresses
export async function getUserAddresses() {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/shipping-addresses`, { headers: headers(token) })
  if (!res.ok) return []
  return res.json()
}

export async function createAddress(data) {
  const token = getToken()
  const res = await fetch(`${API_URL}/api/shipping-addresses`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(data),
  })
  return res.json()
}

// Aliases for backward compatibility
export const getOrders = getUserOrders
export const getOrder = async (id) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`${API_URL}/api/orders/${id}`, {
    headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) throw new Error('Order not found')
  return res.json()
}
