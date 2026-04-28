const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique'

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

function authHeaders() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    'X-Brand-Name': BRAND,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/* Accept either snake_case or camelCase from callers and always send the
   shape the backend expects (snake_case). Phone/postal field aliases are
   common cross-brand sources of confusion — normalise them here once. */
function normalise(data = {}) {
  return {
    full_name:    data.full_name    ?? data.fullName    ?? '',
    address:      data.address      ?? '',
    city:         data.city         ?? '',
    state:        data.state        ?? '',
    postal_code:  data.postal_code  ?? data.postalCode  ?? data.pincode ?? '',
    country:      data.country      ?? 'India',
    phone_number: data.phone_number ?? data.phoneNumber ?? data.phone   ?? '',
    is_default:   data.is_default   ?? data.isDefault   ?? false,
  }
}

/* ── List ─────────────────────────────────────────────────────── */
export async function getAddresses() {
  const res = await fetch(`${API_URL}/api/shipping-addresses`, {
    headers: authHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Failed to load addresses')
  return Array.isArray(data)
    ? data
    : (data.shippingAddresses || data.addresses || data.data || [])
}

/* ── Create ───────────────────────────────────────────────────── */
export async function createAddress(data) {
  const res = await fetch(`${API_URL}/api/shipping-addresses`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(normalise(data)),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(result.message || 'Failed to save address')
  return result
}

/* ── Update ───────────────────────────────────────────────────── */
export async function updateAddress(id, data) {
  const res = await fetch(`${API_URL}/api/shipping-addresses/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(normalise(data)),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(result.message || 'Failed to update address')
  return result
}

/* ── Delete ───────────────────────────────────────────────────── */
export async function deleteAddress(id) {
  const res = await fetch(`${API_URL}/api/shipping-addresses/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(result.message || 'Failed to delete address')
  return result
}

/* ── Set default ──────────────────────────────────────────────── */
export async function setDefaultAddress(id) {
  const res = await fetch(`${API_URL}/api/shipping-addresses/${id}/default`, {
    method: 'PUT',
    headers: authHeaders(),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(result.message || 'Failed to set default address')
  return result
}
