export interface CartItem {
  id: string
  productId: string
  variantId: string
  name: string
  color: string
  size: string
  price: number
  quantity: number
  imageUrl: string
  handle: string
}

export interface Cart {
  id: string
  items: CartItem[]
  subtotal: number
  total: number
  shippingCost: number
}
