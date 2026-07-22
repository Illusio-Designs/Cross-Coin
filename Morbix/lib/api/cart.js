/* Cart API — mirrors Knitwink/lib/api/cart.js for the Morbix brand.
 * Server-side cart for logged-in users. Guests use a localStorage cart
 * (see context/CartContext.jsx). Endpoints: /api/cart, /api/cart/items.
 */
import { API_URL, authHeaders } from './client';

export async function getCart() {
  const res = await fetch(`${API_URL}/api/cart`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch cart');
  const data = await res.json();
  return data.cart || data.items || data || [];
}

export async function addToCart({ productId, variationId, quantity = 1, size = null }) {
  const res = await fetch(`${API_URL}/api/cart/items`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ productId, variationId, quantity, size }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to add to cart');
  return data;
}

export async function updateCartItem(productId, quantity, variationId = null) {
  const res = await fetch(`${API_URL}/api/cart/items/${productId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ quantity, variationId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to update cart');
  return data;
}

export async function removeFromCart(productId, variationId = null) {
  let url = `${API_URL}/api/cart/items/${productId}`;
  if (variationId != null) url += `/${variationId}`;
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to remove from cart');
  return data;
}

export async function clearCart() {
  const res = await fetch(`${API_URL}/api/cart`, { method: 'DELETE', headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to clear cart');
  return data;
}
