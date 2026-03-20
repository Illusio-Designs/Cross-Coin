import { apiClient } from './client'
import type { Order } from '@/types'
import type { Address } from '@/types'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

export const getOrders = async () => {
  const res = await fetch(`${API_URL}/orders`, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error('Failed to fetch orders')
  return res.json() as Promise<Order[]>
}

export const getOrder = async (id: string) => {
  const res = await fetch(`${API_URL}/orders/${id}`, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error('Failed to fetch order')
  return res.json() as Promise<Order>
}

export const createOrder = (data: {
  shippingAddress: Address
  paymentDetails: Record<string, string>
}) => apiClient.post<Order>('/orders', data)
