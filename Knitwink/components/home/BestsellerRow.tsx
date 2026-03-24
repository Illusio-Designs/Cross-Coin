'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

const FALLBACK_PRODUCTS: Product[] = [
  { id: '1', handle: 'wool-runner', name: 'Wool Runner', collectionName: "Men's", price: 13500, images: [{ url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', alt: 'Wool Runner' }], variants: [], colors: [{ name: 'Natural Grey', hex: '#bebab0', imageIndex: 0 }], features: [], description: '', carbonFootprint: 9.9, materials: [], badge: 'Bestseller' },
  { id: '2', handle: 'tree-runner', name: 'Tree Runner', collectionName: "Women's", price: 13500, images: [{ url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=80', alt: 'Tree Runner' }], variants: [], colors: [{ name: 'Blizzard', hex: '#f7f5f0', imageIndex: 0 }], features: [], description: '', carbonFootprint: 7.6, materials: [], badge: 'New' },
  { id: '3', handle: 'wool-dasher', name: 'Wool Dasher', collectionName: "Men's", price: 15500, images: [{ url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80', alt: 'Wool Dasher' }], variants: [], colors: [{ name: 'Sage', hex: '#7b9e87', imageIndex: 0 }], features: [], description: '', carbonFootprint: 10.2, materials: [] },
  { id: '4', handle: 'tree-flyer', name: 'Tree Flyer', collectionName: "Women's", price: 17500, images: [{ url: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80', alt: 'Tree Flyer' }], variants: [], colors: [{ name: 'Earth', hex: '#c4956a', imageIndex: 0 }], features: [], description: '', carbonFootprint: 8.4, materials: [] },
  { id: '5', handle: 'wool-piper', name: 'Wool Piper', collectionName: "Women's", price: 11500, images: [{ url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', alt: 'Wool Piper' }], variants: [], colors: [{ name: 'Cream', hex: '#f2f0eb', imageIndex: 0 }], features: [], description: '', carbonFootprint: 8.1, materials: [], badge: 'Sale' },
]

interface BestsellerRowProps {
  products?: Product[]
}

export function BestsellerRow({ products }: BestsellerRowProps) {
  const items = products && products.length > 0 ? products : FALLBACK_PRODUCTS
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: true })

  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white py-10 md:py-12">
      <div className="mb-6 flex items-center justify-between px-6 md:px-8">
        <h2 className="font-display text-3xl font-normal text-brand-black lg:text-4xl">
          Bestsellers
        </h2>
        <div className="hidden gap-2 lg:flex">
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-800 transition-colors duration-150 hover:border-brand-black hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-800 transition-colors duration-150 hover:border-brand-black hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-3 px-6 md:px-8">
          {items.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.handle}`}
              className="group w-[220px] shrink-0 rounded-2xl border border-gray-200 bg-white p-3 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2 md:w-[260px]"
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 p-4">
                <Image
                  src={product.images[0]?.url ?? ''}
                  alt={product.images[0]?.alt ?? product.name}
                  fill
                  sizes="260px"
                  className="object-contain object-center"
                />
              </div>
              <div className="mt-3 px-1">
                <p className="truncate text-xs font-semibold uppercase tracking-wide text-brand-black">{product.name}</p>
                <p className="mt-0.5 text-sm text-gray-600">{product.colors[0]?.name ?? ''}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {product.colors.slice(0, 3).map((c) => (
                      <span key={c.name} className="h-4 w-4 rounded-full border border-gray-200" style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-brand-black">{formatPrice(product.price)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
