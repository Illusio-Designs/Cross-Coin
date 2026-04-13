import { apiClient } from './client';


export const getCart = () => apiClient.get('/api/cart');

export const addItem = (variantId, quantity = 1) =>
apiClient.post('/api/cart/items', { variantId, quantity });

export const updateItem = (itemId, quantity) =>
apiClient.patch(`/api/cart/items/${itemId}`, { quantity });

export const removeItem = (itemId) =>
apiClient.delete(`/api/cart/items/${itemId}`);