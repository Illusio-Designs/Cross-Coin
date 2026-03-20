import Image from 'next/image'
import Link from 'next/link'
import type { Collection } from '@/types'

// Fallback tiles when API data isn't available
const FALLBACK_TILES = [
  { name: "Men's", handle: 'mens', image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=80' },
  { name: "Women's", handle: 'womens', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80' },
  { name: 'Running', handle: 'running', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80' },
  { name: 'New Arrivals', handle: 'new-arrivals', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' },
]

interface CollectionGridProps {
  collections?: Collection[]
}

export function CollectionGrid({ collections }: CollectionGridProps) {
  const tiles =
    collections && collections.length > 0
      ? collections.slice(0, 4).map((c) => ({
          name: c.name,
          handle: c.handle,
          image: c.imageUrl,
        }))
      : FALLBACK_TILES

  return (
    <section className="mx-auto max-w-site px-6 py-16 md:px-10 md:py-24 lg:px-16 lg:py-32">
      <h2 className="mb-8 text-center font-display text-3xl font-normal text-brand-black lg:text-4xl">
        Shop by Collection
      </h2>
      <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.handle}
            href={`/collections/${tile.handle}`}
            className="group relative overflow-hidden rounded-2xl bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            <div className="relative aspect-[3/4]">
              <Image
                src={tile.image}
                alt={tile.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-black/50 to-transparent" />
              <span className="absolute bottom-4 left-4 font-display text-lg font-normal text-white">
                {tile.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
