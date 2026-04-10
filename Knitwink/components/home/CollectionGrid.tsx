import Image from 'next/image'
import Link from 'next/link'
import type { Collection } from '@/types'
import type { Category } from '@/lib/api/categories'

const FALLBACK_TILES = [
  { name: "Men's", handle: 'mens', image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=80' },
  { name: "Women's", handle: 'womens', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80' },
  { name: 'Running', handle: 'running', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80' },
  { name: 'New Arrivals', handle: 'new-arrivals', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' },
]

interface CollectionGridProps {
  collections?: Collection[]
  categories?: Category[]
}

export function CollectionGrid({ collections, categories = [] }: CollectionGridProps) {
  // Prefer API categories, then collections, then fallback
  const tiles =
    categories.length > 0
      ? categories.slice(0, 4).map((c) => {
          // Clean double-encoded ImageKit URLs
          let img = c.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'
          // If URL contains another https:// inside it, extract the real URL
          const match = img.match(/https?:\/\/ik\.imagekit\.io\/.+/)
          if (match && img.indexOf('https://') !== img.lastIndexOf('https://')) {
            img = img.substring(img.lastIndexOf('https://'))
          }
          return { name: c.name, handle: c.slug || String(c.id), image: img }
        })
      : collections && collections.length > 0
        ? collections.slice(0, 4).map((c) => ({ name: c.name, handle: c.handle, image: c.imageUrl }))
        : FALLBACK_TILES

  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-4 py-10 md:px-6 md:py-14">
      <h2 className="mb-6 text-center font-display text-3xl font-normal text-brand-black lg:text-4xl">
        Shop by Collection
      </h2>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.handle}
            href={`/Products?category=${encodeURIComponent(tile.name)}`}
            className="group relative overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            <div className="relative aspect-[3/4]">
              <Image
                src={tile.image}
                alt={tile.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-black/50 to-transparent" />
              <span className="absolute bottom-4 left-4 text-sm font-medium text-white">
                {tile.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
