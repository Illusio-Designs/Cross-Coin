import { apiClient } from './client';


export const getCart = () => apiClient.get('/cart');

export const addItem = (variantId, quantity = 1) =>
apiClient.post('/cart/items', { variantId, quantity });

export const updateItem = (itemId, quantity) =>
apiClient.patch(`/cart/items/${itemId}`, { quantity });

export const removeItem = (itemId) =>
apiClient.delete(`/cart/items/${itemId}`);