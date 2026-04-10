import type { Product, Collection, Material } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000'
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'knitwink'

function cleanUrl(url: string | undefined): string {
  if (!url) return ''
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'))
  }
  return url
}

async function brandFetch<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'X-Brand-Name': BRAND_NAME },
    next: { revalidate },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${path}`)
  return res.json()
}

// Map backend product to Knitwink Product type
function mapProduct(p: any): Product {
  const variations = p.ProductVariations || p.variations || []
  const images = p.ProductImages || p.images || []

  // Get price from first variation
  const firstVar = variations[0]
  const price = Number(firstVar?.price || p.price || 0)
  const compareAtPrice = firstVar?.comparePrice ? Number(firstVar.comparePrice) : undefined

  // Map images — backend uses image_url field
  const productImages = images.map((img: any) => ({
    url: cleanUrl(img.image_url || img.medium || img.url || '') || '',
    alt: img.alt_text || p.name,
  }))

  // CSS color name → hex fallback map
  const colorNameToHex: Record<string, string> = {
    white: '#ffffff', black: '#000000', red: '#ef4444', blue: '#3b82f6',
    navy: '#1e3a5f', green: '#22c55e', yellow: '#eab308', orange: '#f97316',
    pink: '#ec4899', purple: '#a855f7', grey: '#9ca3af', gray: '#9ca3af',
    brown: '#92400e', beige: '#d4b896', cream: '#fffdd0', maroon: '#800000',
    teal: '#14b8a6', cyan: '#06b6d4', lime: '#84cc16', indigo: '#6366f1',
    violet: '#7c3aed', magenta: '#d946ef', coral: '#f87171', peach: '#fbbf24',
    mint: '#6ee7b7', lavender: '#c4b5fd', charcoal: '#374151', ivory: '#fffff0',
    khaki: '#c3b091', mustard: '#d4a017', rust: '#b45309', olive: '#6b7280',
  }

  // Extract colors from variation attributes
  const colors: { name: string; hex: string; imageIndex: number }[] = []
  const seen = new Set<string>()
  variations.forEach((v: any) => {
    const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes || '{}') : (v.attributes || {})
    const colorArr = Array.isArray(attrs.color) ? attrs.color : (attrs.color ? [attrs.color] : [])
    colorArr.forEach((c: string) => {
      if (!seen.has(c)) {
        seen.add(c)
        const key = c.toLowerCase().trim()
        // Use hex if it looks like a hex code, else look up by name, else derive via CSS
        const hex = /^#[0-9a-f]{3,6}$/i.test(key)
          ? key
          : colorNameToHex[key] ?? null
        colors.push({ name: c, hex: hex || c, imageIndex: 0 })
      }
    })
  })

  // Badge from product badge field
  const badgeMap: Record<string, 'New' | 'Sale' | 'Bestseller'> = {
    new_arrival: 'New',
    hot_selling: 'Bestseller',
    low_stock: 'Sale',
  }

  return {
    id: String(p.id),
    handle: p.slug || String(p.id),
    name: p.name,
    collectionName: p.category?.name || p.Category?.name || '',
    price,
    compareAtPrice,
    images: productImages.length > 0 ? productImages : [{ url: '', alt: p.name }],
    variants: variations.map((v: any) => ({
      id: String(v.id),
      size: '',
      color: '',
      stock: Number(v.stock || 0),
      sku: v.sku || '',
    })),
    colors: colors.length > 0 ? colors : [{ name: '', hex: '#d1d5db', imageIndex: 0 }],
    features: [],
    description: p.description || '',
    carbonFootprint: 0,
    badge: badgeMap[p.badge] as any,
    materials: [],
  }
}

export async function getPublicProducts(limit = 20): Promise<Product[]> {
  try {
    const data = await brandFetch<any>(
      `/api/products/catalog?limit=${limit}`,
      60
    )
    const products = data?.data?.products || data?.data || data?.products || []
    return Array.isArray(products) ? products.map(mapProduct) : []
  } catch {
    return []
  }
}

export async function getBestsellers(): Promise<Product[]> {
  try {
    const data = await brandFetch<any>(`/api/products/best-sellers?limit=10`, 60)
    const products = data?.data?.products || data?.data || data?.products || []
    if (!Array.isArray(products) || products.length === 0) return getPublicProducts(10)
    return products.map(mapProduct)
  } catch {
    return getPublicProducts(10)
  }
}

export async function getFeaturedCollections(): Promise<Collection[]> {
  return []
}

export const getProduct = async (handle: string): Promise<Product> => {
  const data = await brandFetch<any>(`/api/products/by-slug/${handle}`, 120)
  return mapProduct(data?.data || data)
}

export const getProducts = async (): Promise<Product[]> => getPublicProducts()

export const getCollection = async (_handle: string): Promise<Collection> => ({} as Collection)

export const getMaterials = async (): Promise<Material[]> => []

export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
    const data = await brandFetch<any>(`/api/products/search?q=${encodeURIComponent(query)}&limit=20`, 0)
    const products = data?.data || data?.products || []
    return Array.isArray(products) ? products.map(mapProduct) : []
  } catch {
    return []
  }
}

export const getQuizRecommendations = async (_answers: Record<string, string>): Promise<Product[]> => []
