export interface ProductImage {
  url: string
  alt: string
}

export interface ProductVariant {
  id: string
  size: string
  color: string
  stock: number
  sku: string
}

export interface Feature {
  icon: string
  title: string
  description: string
}

export interface Material {
  name: string
  description: string
  imageUrl: string
  carbonRating: number
}

export interface Product {
  id: string
  handle: string
  name: string
  collectionName: string
  price: number
  compareAtPrice?: number
  sku?: string
  images: ProductImage[]
  colorImages?: Record<string, ProductImage[]>
  variants: ProductVariant[]
  colors: ProductColor[]
  features: Feature[]
  description: string
  carbonFootprint: number
  badge?: 'New' | 'Sale' | 'Bestseller'
  materials: string[]
}

export interface ProductColor {
  name: string
  hex: string
  imageIndex: number
}
