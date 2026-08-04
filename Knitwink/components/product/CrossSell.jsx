'use client'

import { useQuery } from '@tanstack/react-query'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getBestsellers } from '@/lib/api/products'
import { ProductCard } from '@/components/collection/ProductCard'

/**
 * Cross-sell carousel under the product detail.
 *
 * Accepts `initialBestsellers` from the server shell so the first
 * render has no network round-trip. After hydration, useQuery uses
 * `initialData` to seed the cache; subsequent navigations to other
 * products serve from the cache (5-min stale time inherited from the
 * shared queryClient defaults).
 */
export function CrossSell({ currentHandle, initialBestsellers }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: true })

  const { data: all = [] } = useQuery({
    queryKey: ['bestsellers'],
    queryFn: () => getBestsellers().catch(() => []),
    initialData: initialBestsellers,
  })

  const products = all.filter((p) => p.handle !== currentHandle)
  if (!products.length) return null

  return (
    <div className="py-6">
      <div className="mb-5 flex items-center px-3">
        <div className="flex-1" />
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-black">You May Also Like</p>
        <div className="flex flex-1 justify-end gap-1.5">
          <button onClick={() => emblaApi?.scrollPrev()} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:border-brand-black hover:text-brand-black no-touch-min" aria-label="Previous">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => emblaApi?.scrollNext()} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:border-brand-black hover:text-brand-black no-touch-min" aria-label="Next">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-3 px-3">
          {products.map((product) => (
            <div key={product.id} className="w-[220px] shrink-0 md:w-[260px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
