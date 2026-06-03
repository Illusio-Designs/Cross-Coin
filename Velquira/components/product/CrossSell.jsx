'use client'

import { useEffect, useState } from 'react'
import { getBestsellers } from '@/lib/api/products'
import { ProductCard } from '@/components/collection/ProductCard'

export function CrossSell({ currentHandle, relatedProducts, crossSellProducts }) {
  const [products, setProducts] = useState(() => {
    /* Prefer explicitly supplied related/cross-sell data when available
       (preserves the existing data wiring). */
    const seed = crossSellProducts || relatedProducts
    return Array.isArray(seed) ? seed : []
  })

  useEffect(() => {
    // If we already have curated picks, do nothing; otherwise pull bestsellers.
    if (products.length > 0) return
    let active = true
    getBestsellers()
      .then((all) => {
        if (!active) return
        const filtered = (all || []).filter((p) => p.handle !== currentHandle)
        setProducts(filtered)
      })
      .catch(() => {})
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHandle])

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