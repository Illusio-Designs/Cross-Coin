'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/collection/ProductCard'

export function BestsellerRow({ products = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: true })

  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white py-10 md:py-12">
      <div className="mb-6 flex items-center justify-between px-6 md:px-8">
        <h2 className="font-display text-3xl font-normal text-brand-black lg:text-4xl">Bestsellers</h2>
        <div className="hidden gap-2 lg:flex">
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-800 transition-colors hover:border-brand-black hover:text-brand-black"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-800 transition-colors hover:border-brand-black hover:text-brand-black"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex gap-3 overflow-hidden px-6 md:px-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[220px] shrink-0 md:w-[260px]">
              <div className="aspect-square w-full animate-pulse rounded-2xl bg-gray-100" />
              <div className="mt-3 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-3 px-6 md:px-8">
            {products.map((product) => (
              <div key={product.id} className="w-[220px] shrink-0 md:w-[260px]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
