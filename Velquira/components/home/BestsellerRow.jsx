'use client'

import useEmblaCarousel from 'embla-carousel-react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/collection/ProductCard'

/* ─────────────────────────────────────────────────────────────────────────
   Chapter IV — "Most Coveted"
   Editorial header with Roman + Playfair + hairline+diamond+hairline.
   Carousel + ProductCard contract preserved.
   ──────────────────────────────────────────────────────────────────────── */

export function BestsellerRow({ products = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: true })

  return (
    <section className="bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-site">
        {/* Chapter header — centred */}
        <div className="mb-14 flex flex-col items-center text-center md:mb-20">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
            Most Coveted
          </p>
          <h2 className="mt-5 font-display text-4xl font-normal leading-tight tracking-tight text-brand-black md:text-5xl">
            Bestselling Pieces
          </h2>
          {/* hairline + diamond + hairline */}
          <div className="mt-7 flex items-center gap-4">
            <span className="h-px w-12 bg-gold/40" />
            <span className="vq-diamond" aria-hidden />
            <span className="h-px w-12 bg-gold/40" />
          </div>
        </div>

        {/* Carousel controls row — View All left, arrows right */}
        <div className="mb-10 flex items-center justify-between">
          <Link
            href="/collections"
            className="group/all inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-gold"
          >
            View All
            <span
              aria-hidden
              className="inline-block transition-transform duration-500 ease-out group-hover/all:translate-x-1"
            >
              →
            </span>
            <span
              aria-hidden
              className="ml-1 inline-block h-px w-0 origin-left bg-gold transition-all duration-500 ease-out group-hover/all:w-10"
            />
          </Link>

          <div className="flex gap-2.5">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-brand-black transition-colors hover:border-gold hover:text-gold"
              aria-label="Previous"
            >
              <ChevronLeft size={14} strokeWidth={1.3} />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-brand-black transition-colors hover:border-gold hover:text-gold"
              aria-label="Next"
            >
              <ChevronRight size={14} strokeWidth={1.3} />
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="flex gap-7 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[240px] shrink-0 md:w-[280px]">
                <div className="aspect-square w-full animate-pulse border border-gold/15 bg-cream" />
                <div className="mt-5 space-y-2.5">
                  <div className="mx-auto h-3 w-2/3 animate-pulse bg-cream" />
                  <div className="mx-auto h-3 w-1/3 animate-pulse bg-cream" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex gap-7">
              {products.map((product) => (
                <div key={product.id} className="w-[240px] shrink-0 md:w-[280px]">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}