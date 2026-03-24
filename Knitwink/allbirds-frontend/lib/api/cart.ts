import { apiClient } from './client'
import type { Cart } from '@/types'

export const getCart = () => apiClient.get<Cart>('/cart')

export const addItem = (variantId: string, quantity = 1) =>
  apiClient.post<Cart>('/cart/items', { variantId, quantity })

export const updateItem = (itemId: string, quantity: number) =>
  apiClient.patch<Cart>(`/cart/items/${itemId}`, { quantity })

export const removeItem = (itemId: string) =>
  apiClient.delete<Cart>(`/cart/items/${itemId}`)
