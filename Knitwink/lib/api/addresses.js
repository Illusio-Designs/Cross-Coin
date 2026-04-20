const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND = 'knitwink'

function h() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

export async function getAddresses() {
  const res = await fetch(`${API_URL}/api/shipping-addresses`, { headers: h() })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data?.shippingAddresses || data?.addresses || []
}

function normalise(data) {
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

export async function createAddress(data) {
  const res = await fetch(`${API_URL}/api/shipping-addresses`, { method: 'POST', headers: h(), body: JSON.stringify(normalise(data)) })
  const result = await res.json()
  if (!res.ok) throw new Error(result.message || 'Failed to create address')
  return result
}

export async function updateAddress(id, data) {
  const res = await fetch(`${API_URL}/api/shipping-addresses/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(normalise(data)) })
  const result = await res.json()
  if (!res.ok) throw new Error(result.message || 'Failed to update address')
  return result
}

export async function deleteAddress(id) {
  const res = await fetch(`${API_URL}/api/shipping-addresses/${id}`, { method: 'DELETE', headers: h() })
  if (!res.ok) throw new Error('Failed to delete address')
  return res.json()
}

export async function setDefaultAddress(id) {
  const res = await fetch(`${API_URL}/api/shipping-addresses/${id}/default`, { method: 'PUT', headers: h() })
  if (!res.ok) throw new Error('Failed to set default')
  return res.json()
}
