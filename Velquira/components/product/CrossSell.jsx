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
    <section className="bg-ivory px-4 pb-28 pt-24 lg:px-8">
      <div className="mx-auto max-w-site">
        {/* Section heading */}
        <div className="flex flex-col items-start">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
            Curated Pairings
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-normal leading-tight tracking-tight text-brand-black md:text-5xl">
            Complete the Set
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-brand-black/60">
            Pieces composed in the same hand — to wear alone or together.
          </p>
          <span className="mt-6 inline-block h-px w-12 bg-gold/60" aria-hidden />
        </div>

        {/* Three-up grid */}
        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {picks.map((product, i) => (
            <ProductCard key={product.id || product.handle} product={product} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
