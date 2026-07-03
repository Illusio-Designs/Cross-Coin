'use client'

import useEmblaCarousel from 'embla-carousel-react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/collection/ProductCard'

/**
 * BestsellerRow — obsidian luxe carousel band.
 * Dark ground makes product photography glow; gold accents throughout.
 */
export function BestsellerRow({ products = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: true })

  return (
    <section className="relative overflow-hidden bg-brand-black px-6 py-24 text-white md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, #bf8b2e 0%, transparent 50%), radial-gradient(circle at 80% 50%, #bf8b2e 0%, transparent 50%)',
        }}
      />

      <div className="relative mx-auto max-w-site">
        <div className="mb-14 flex flex-col items-start md:mb-20 lg:max-w-xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-gold">
            Most Coveted
          </p>
          <h2 className="vq-display mt-4 text-4xl text-white md:text-5xl">
            Bestselling Pieces
          </h2>
          <div className="mt-6 flex items-center gap-4">
            <span className="h-px w-12 bg-gold/50" />
            <span className="vq-diamond" aria-hidden />
            <span className="h-px w-12 bg-gold/50" />
          </div>
        </div>

        <div className="mb-10 flex items-center justify-between">
          <Link
            href="/collections"
            className="group/all inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-gold"
          >
            View All
            <span className="inline-block transition-transform duration-500 group-hover/all:translate-x-1">→</span>
          </Link>

          <div className="flex gap-2.5">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-white transition-colors hover:border-gold hover:bg-gold hover:text-brand-black"
              aria-label="Previous"
            >
              <ChevronLeft size={14} strokeWidth={1.3} />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-white transition-colors hover:border-gold hover:bg-gold hover:text-brand-black"
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
                <div className="aspect-square w-full animate-pulse border border-gold/15 bg-white/5" />
              </div>
            ))}
          </div>
        ) : (
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex gap-7">
              {products.map((product) => (
                <div key={product.id} className="w-[240px] shrink-0 md:w-[280px]">
                  <ProductCard product={product} variant="dark" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
