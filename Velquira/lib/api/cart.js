import { apiClient } from '@/lib/api/client'

export async function getCart() {
  const data = await apiClient.get('/api/cart')
  return data.cart || data.items || data || []
}

export async function addToCart({ productId, variationId, quantity = 1, size = null }) {
  return apiClient.post('/api/cart/items', { productId, variationId, quantity, size })
}

export async function updateCartItem(productId, quantity, variationId = null) {
  return apiClient.put(`/api/cart/items/${productId}`, { quantity, variationId })
}

export async function removeFromCart(productId, variationId = null) {
  let path = `/api/cart/items/${productId}`
  if (variationId != null) path += `/${variationId}`
  return apiClient.delete(path)
}

export async function clearCart() {
  return apiClient.delete('/api/cart')
}
