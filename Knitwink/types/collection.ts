import type { Product } from './product'

export interface Collection {
  id: string
  handle: string
  name: string
  description: string
  imageUrl: string
  products: Product[]
}
