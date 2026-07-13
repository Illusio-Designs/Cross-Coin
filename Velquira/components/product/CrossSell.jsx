'use client'

import { useQuery } from '@tanstack/react-query'
import { getBestsellers } from '@/lib/api/products'
import { ProductCard } from '@/components/collection/ProductCard'

/**
 * Curated pairings under the product detail.
 *
 * Accepts `initialBestsellers` from the server shell so the first
 * render has no network round-trip. After hydration, useQuery seeds
 * the cache via `initialData`; subsequent navigations to other
 * product pages reuse the cached set (5-min stale time inherited
 * from the shared queryClient).
 *
 * Honors the legacy `relatedProducts` / `crossSellProducts` props as
 * a fallback so admin-curated picks still win when supplied.
 */
export function CrossSell({ currentHandle, relatedProducts, crossSellProducts, initialBestsellers }) {
  const curated = crossSellProducts || relatedProducts
  const hasCurated = Array.isArray(curated) && curated.length > 0

  const { data: all = [] } = useQuery({
    queryKey: ['bestsellers'],
    queryFn: () => getBestsellers().catch(() => []),
    initialData: Array.isArray(initialBestsellers) ? initialBestsellers : undefined,
    enabled: !hasCurated,
  })

  const products = hasCurated
    ? curated
    : (all || []).filter((p) => p.handle !== currentHandle)

  if (!products.length) return null
  const picks = products.slice(0, 3)

  return (
    <section className="vq-section bg-cream">
      <div className="vq-container">
        {/* Section heading */}
        <div className="mb-12 md:mb-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Related Products</p>
          <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
            You May Also Like <span className="text-gold">✦</span>
          </h2>
          <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
        </div>

        {/* Three-up grid */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {picks.map((product, i) => (
            <ProductCard key={product.id || product.handle} product={product} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
