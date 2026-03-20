import type { Product, Collection, Material } from '@/types'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

async function serverFetch<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate } })
  if (!res.ok) throw new Error(`Failed to fetch ${path}`)
  return res.json()
}

export const getProduct = (handle: string) =>
  serverFetch<Product>(`/products/${handle}`, 120)

export const getProducts = () =>
  serverFetch<Product[]>('/products', 60)

export const getCollection = (handle: string) =>
  serverFetch<Collection>(`/collections/${handle}`, 60)

export const getFeaturedCollections = () =>
  serverFetch<Collection[]>('/collections/featured', 60)

export const getBestsellers = () =>
  serverFetch<Product[]>('/products/bestsellers', 60)

export const getMaterials = () =>
  serverFetch<Material[]>('/materials', 3600)

export const searchProducts = (query: string) =>
  serverFetch<Product[]>(`/products/search?q=${encodeURIComponent(query)}`, 0)

export const getQuizRecommendations = async (answers: Record<string, string>) => {
  const res = await fetch(`${API_URL}/quiz/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers),
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error('Failed to get recommendations')
  return res.json() as Promise<Product[]>
}
