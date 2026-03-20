'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: '1', handle: 'wool-runner', name: 'Wool Runner', collectionName: "Men's",
    price: 13500, images: [{ url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', alt: 'Wool Runner' }],
    variants: [], colors: [{ name: 'Natural Grey', hex: '#bebab0', imageIndex: 0 }],
    features: [], description: '', carbonFootprint: 9.9, materials: [], badge: 'Bestseller',
  },
  {
    id: '2', handle: 'tree-runner', name: 'Tree Runner', collectionName: "Women's",
    price: 13500, images: [{ url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=80', alt: 'Tree Runner' }],
    variants: [], colors: [{ name: 'Blizzard', hex: '#f7f5f0', imageIndex: 0 }],
    features: [], description: '', carbonFootprint: 7.6, materials: [], badge: 'New',
  },
  {
    id: '3', handle: 'wool-dasher', name: 'Wool Dasher', collectionName: "Men's",
    price: 15500, images: [{ url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80', alt: 'Wool Dasher' }],
    variants: [], colors: [{ name: 'Sage', hex: '#7b9e87', imageIndex: 0 }],
    features: [], description: '', carbonFootprint: 10.2, materials: [],
  },
  {
    id: '4', handle: 'tree-flyer', name: 'Tree Flyer', collectionName: "Women's",
    price: 17500, images: [{ url: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80', alt: 'Tree Flyer' }],
    variants: [], colors: [{ name: 'Earth', hex: '#c4956a', imageIndex: 0 }],
    features: [], description: '', carbonFootprint: 8.4, materials: [],
  },
  {
    id: '5', handle: 'wool-piper', name: 'Wool Piper', collectionName: "Women's",
    price: 11500, images: [{ url: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80', alt: 'Wool Piper' }],
    variants: [], colors: [{ name: 'Cream', hex: '#f2f0eb', imageIndex: 0 }],
    features: [], description: '', carbonFootprint: 8.1, materials: [], badge: 'Sale',
  },
]

interface BestsellerRowProps {
  products?: Product[]
}

export function BestsellerRow({ products }: BestsellerRowProps) {
  const items = products && products.length > 0 ? products : FALLBACK_PRODUCTS
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: true })

  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-site px-6 md:px-10 lg:px-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-3xl font-normal text-brand-black lg:text-4xl">
            Bestsellers
          </h2>
          {/* Desktop arrow nav */}
          <div className="hidden gap-2 lg:flex">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-800 transition-colors duration-150 hover:border-brand-black hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-800 transition-colors duration-150 hover:border-brand-black hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-4 px-6 md:px-10 lg:px-16">
          {items.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.handle}`}
              className="group w-[260px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 md:w-[300px]"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
                <Image
                  src={product.images[0]?.url ?? ''}
                  alt={product.images[0]?.alt ?? product.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="mt-3 flex flex-col gap-1">
                <p className="text-sm text-gray-800">{product.name}</p>
                <p className="text-sm font-medium text-brand-black">{formatPrice(product.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
