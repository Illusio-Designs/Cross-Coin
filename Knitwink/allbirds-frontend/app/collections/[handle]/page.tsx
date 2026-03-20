import type { Metadata } from 'next'
import type { Product } from '@/types'
import { getCollection } from '@/lib/api/products'
import { applyFiltersAndSort } from '@/lib/api/collections'
import { ProductGrid } from '@/components/collection/ProductGrid'
import { CollectionControls } from '@/components/collection/CollectionControls'

interface Props {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ filter?: string; status?: string; sort?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  try {
    const collection = await getCollection(handle)
    return {
      title: collection.name,
      description: collection.description,
    }
  } catch {
    return { title: 'Collection' }
  }
}

// Fallback products for when API is unavailable
const FALLBACK_PRODUCTS: Product[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  handle: `product-${i + 1}`,
  name: ['Wool Runner', 'Tree Runner', 'Wool Dasher', 'Tree Flyer', 'Wool Piper', 'Tree Breeze', 'Wool Lounger', 'Tree Dasher'][i],
  collectionName: i % 2 === 0 ? "Men's" : "Women's",
  price: 11500 + i * 1000,
  compareAtPrice: i % 3 === 0 ? 14500 + i * 1000 : undefined,
  images: [
    { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', alt: 'Product image' },
    { url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=80', alt: 'Product image alternate' },
  ],
  variants: [],
  colors: [
    { name: 'Natural Grey', hex: '#bebab0', imageIndex: 0 },
    { name: 'Blizzard', hex: '#f7f5f0', imageIndex: 0 },
    { name: 'Sage', hex: '#7b9e87', imageIndex: 0 },
  ],
  features: [],
  description: '',
  carbonFootprint: 9.9,
  badge: (i === 0 ? 'Bestseller' : i === 2 ? 'New' : i === 4 ? 'Sale' : undefined) as Product['badge'],
  materials: [],
}))

export default async function CollectionPage({ params, searchParams }: Props) {
  const { handle } = await params
  const { filter, status, sort } = await searchParams

  let collectionName = handle.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  let collectionDescription = ''
  let products = FALLBACK_PRODUCTS

  try {
    const collection = await getCollection(handle)
    collectionName = collection.name
    collectionDescription = collection.description
    products = collection.products
  } catch {
    // API unavailable — use fallback data
  }

  const filtered = applyFiltersAndSort(products, filter, status, sort)

  return (
    <div className="mx-auto max-w-site px-6 md:px-10 lg:px-16">
      {/* Header */}
      <div className="pt-16 pb-8 text-center">
        <h1 className="font-display text-4xl font-normal text-brand-black">{collectionName}</h1>
        {collectionDescription && (
          <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-gray-600">
            {collectionDescription}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-400">{filtered.length} products</p>
      </div>

      {/* Controls */}
      <CollectionControls />

      {/* Grid */}
      <div className="py-8">
        <ProductGrid products={filtered} />
      </div>
    </div>
  )
}
