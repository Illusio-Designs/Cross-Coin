import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

const FALLBACK: Product[] = [
  {
    id: 'cs1', handle: 'wool-runner', name: 'Wool Runner', collectionName: "Men's",
    price: 13500, images: [{ url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', alt: 'Wool Runner' }],
    variants: [], colors: [{ name: 'Natural Grey', hex: '#bebab0', imageIndex: 0 }],
    features: [], description: '', carbonFootprint: 9.9, materials: [],
  },
  {
    id: 'cs2', handle: 'tree-runner', name: 'Tree Runner', collectionName: "Women's",
    price: 13500, images: [{ url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&q=80', alt: 'Tree Runner' }],
    variants: [], colors: [{ name: 'Blizzard', hex: '#f7f5f0', imageIndex: 0 }],
    features: [], description: '', carbonFootprint: 7.6, materials: [],
  },
  {
    id: 'cs3', handle: 'wool-dasher', name: 'Wool Dasher', collectionName: "Men's",
    price: 15500, images: [{ url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', alt: 'Wool Dasher' }],
    variants: [], colors: [{ name: 'Sage', hex: '#7b9e87', imageIndex: 0 }],
    features: [], description: '', carbonFootprint: 10.2, materials: [],
  },
  {
    id: 'cs4', handle: 'tree-flyer', name: 'Tree Flyer', collectionName: "Women's",
    price: 17500, images: [{ url: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80', alt: 'Tree Flyer' }],
    variants: [], colors: [{ name: 'Earth', hex: '#c4956a', imageIndex: 0 }],
    features: [], description: '', carbonFootprint: 8.4, materials: [],
  },
]

interface CrossSellProps {
  products?: Product[]
  currentHandle?: string
}

export function CrossSell({ products, currentHandle }: CrossSellProps) {
  const items = (products && products.length > 0 ? products : FALLBACK)
    .filter((p) => p.handle !== currentHandle)
    .slice(0, 4)

  return (
    <section className="border-t border-gray-200 pt-12 mt-12">
      <h2 className="mb-8 font-display text-2xl font-normal text-brand-black lg:text-3xl">
        Pair it with
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {items.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.handle}`}
            className="group flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
              <Image
                src={product.images[0]?.url ?? ''}
                alt={product.images[0]?.alt ?? product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
            <p className="text-sm text-gray-800">{product.name}</p>
            <p className="text-sm font-medium text-brand-black">{formatPrice(product.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
