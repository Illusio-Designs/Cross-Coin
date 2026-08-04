/* Cart API — same backend routes as Knitwink (under /api/cart).
   Used for signed-in shoppers; guests keep a localStorage cart that
   is merged into the backend on their first login. */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'X-Brand-Name': BRAND,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add to cart');
  return data;
}

export async function updateCartItem(productId, quantity, variationId = null) {
  const res = await fetch(`${API_URL}/api/cart/items/${productId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ quantity, variationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update cart');
  return data;
}

export async function removeFromCart(productId, variationId = null) {
  let url = `${API_URL}/api/cart/items/${productId}`;
  if (variationId != null) url += `/${variationId}`;
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to remove from cart');
  return data;
}

export async function clearCart() {
  const res = await fetch(`${API_URL}/api/cart`, { method: 'DELETE', headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to clear cart');
  return data;
}
