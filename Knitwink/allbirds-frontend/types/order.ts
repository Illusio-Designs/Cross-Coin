import type { Address } from './user'

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderItem {
  id: string
  productId: string
  name: string
  color: string
  size: string
  price: number
  quantity: number
  imageUrl: string
  handle: string
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  items: OrderItem[]
  shippingAddress: Address
  subtotal: number
  shippingCost: number
  total: number
  createdAt: string
  updatedAt: string
}
