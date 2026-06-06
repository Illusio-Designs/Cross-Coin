import { apiClient } from '@/lib/api/client'

export async function getAddresses() {
  try {
    const data = await apiClient.get('/api/shipping-addresses', { suppressErrorToast: true })
    return Array.isArray(data) ? data : data?.shippingAddresses || data?.addresses || []
  } catch { return [] }
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
  return apiClient.post('/api/shipping-addresses', normalise(data))
}

export async function updateAddress(id, data) {
  return apiClient.put(`/api/shipping-addresses/${id}`, normalise(data))
}

export async function deleteAddress(id) {
  return apiClient.delete(`/api/shipping-addresses/${id}`)
}

export async function setDefaultAddress(id) {
  return apiClient.put(`/api/shipping-addresses/${id}/default`)
}
