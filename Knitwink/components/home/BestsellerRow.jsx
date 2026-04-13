'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/collection/ProductCard'

export function BestsellerRow({ products = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: true })

  return (
    <div className="py-6">
      <div className="mb-5 flex items-center px-3">
        <div className="flex-1" />
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-black">Most Loved</p>
        <div className="flex flex-1 justify-end gap-1.5">
          <button onClick={() => emblaApi?.scrollPrev()} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:border-brand-black hover:text-brand-black" aria-label="Previous">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => emblaApi?.scrollNext()} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:border-brand-black hover:text-brand-black" aria-label="Next">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex gap-3 overflow-hidden px-3">
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
          <div className="flex gap-3 px-3">
            {products.map((product) => (
              <div key={product.id} className="w-[220px] shrink-0 md:w-[260px]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
