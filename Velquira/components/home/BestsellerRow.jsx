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
    <section className="relative overflow-hidden vq-section text-ink" style={{ background: '#f5f0e6' }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(160, 125, 62, 0.06) 0%, transparent 60%), radial-gradient(circle at 80% 50%, rgba(160, 125, 62, 0.05) 0%, transparent 60%)',
        }}
      />

      <div className="relative vq-container">
        <div className="mb-12 md:mb-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Bestsellers</p>
          <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
            Most Loved <span className="text-gold">✦</span>
          </h2>
          <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
        </div>

        <div className="mb-10 flex items-center justify-between">
          <Link
            href="/collections"
            className="group/all inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-gold"
          >
            View All
            <span className="inline-block transition-transform duration-500 group-hover/all:translate-x-1">→</span>
          </Link>

          <div className="flex gap-4">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink text-ink bg-transparent transition-all duration-300 hover:bg-ink hover:text-white cursor-pointer"
              aria-label="Previous"
            >
              <ChevronLeft size={16} strokeWidth={1.6} />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink text-ink bg-transparent transition-all duration-300 hover:bg-ink hover:text-white cursor-pointer"
              aria-label="Next"
            >
              <ChevronRight size={16} strokeWidth={1.6} />
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="flex gap-7 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[240px] shrink-0 md:w-[280px]">
                <div className="aspect-square w-full animate-pulse border border-line bg-paper" />
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
