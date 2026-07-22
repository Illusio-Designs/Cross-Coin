/* Shipping addresses API — mirrors Knitwink/lib/api/addresses.js.
 * Endpoints: /api/shipping-addresses (+ /:id, /:id/default).
 */
import { API_URL, authHeaders } from './client';

export function normaliseAddr(data) {
  return {
    full_name: data.full_name || data.fullName || '',
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    postal_code: data.postal_code || data.postalCode || data.pincode || '',
    country: data.country || 'India',
    phone_number: data.phone_number || data.phoneNumber || data.phone || '',
    is_default: data.is_default ?? data.isDefault ?? false,
  };
}

export async function getAddresses() {
  const res = await fetch(`${API_URL}/api/shipping-addresses`, { headers: authHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data?.shippingAddresses || data?.addresses || [];
}

export async function createAddress(data) {
  const res = await fetch(`${API_URL}/api/shipping-addresses`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(normaliseAddr(data)),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.message || 'Failed to create address');
  return result;
}

export async function updateAddress(id, data) {
  const res = await fetch(`${API_URL}/api/shipping-addresses/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(normaliseAddr(data)),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.message || 'Failed to update address');
  return result;
}

export async function deleteAddress(id) {
  const res = await fetch(`${API_URL}/api/shipping-addresses/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete address');
  return res.json().catch(() => ({}));
}

export async function setDefaultAddress(id) {
  const res = await fetch(`${API_URL}/api/shipping-addresses/${id}/default`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to set default');
  return res.json().catch(() => ({}));
}

// Knitwink-compatible aliases used by the checkout flow.
export const getUserAddresses = getAddresses;
export const createShippingAddress = createAddress;
export const updateShippingAddress = updateAddress;
