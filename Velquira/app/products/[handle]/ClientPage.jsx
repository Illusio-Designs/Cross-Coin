'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getProduct } from '@/lib/api/products'
import { ProductPageClient } from '@/components/product/ProductPageClient'
import { FeatureHighlight } from '@/components/product/FeatureHighlight'
import { CrossSell } from '@/components/product/CrossSell'
import { ReviewsSection } from '@/components/product/ReviewsSection'
import SeoWrapper from '@/components/SeoWrapper'
import { Reveal } from '@/components/ui/Reveal'

function ProductSkeleton() {
  return (
    <div className="bg-ivory px-5 pt-36 pb-10 lg:px-8">
      <div className="mx-auto max-w-site grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="aspect-square w-full animate-pulse bg-cream lg:col-span-7" />
        <div className="flex flex-col gap-4 py-6 lg:col-span-5">
          <div className="h-3 w-24 animate-pulse bg-cream" />
          <div className="h-8 w-3/4 animate-pulse bg-cream" />
          <div className="h-6 w-28 animate-pulse bg-cream" />
          <div className="h-12 w-full animate-pulse bg-cream" />
        </div>
      </div>
    </div>
  )
}

export default function ProductPage({ initialProduct = null, initialBestsellers = [], initialReviews = null, initialStats = null }) {
  const { handle } = useParams()
  const [product, setProduct] = useState(initialProduct)
  const [loading, setLoading] = useState(!initialProduct)

  useEffect(() => {
    if (!handle || initialProduct) return
    setLoading(true)
    getProduct(handle)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [handle, initialProduct])

  if (loading) return <ProductSkeleton />
  if (!product) return (
    <div className="bg-ivory px-5 py-32 text-center">
      <p className="font-display text-3xl text-brand-black/75">Piece not found.</p>
      <Link
        href="/collections/all"
        className="mt-6 inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.28em] text-gold hover:text-gold-deep"
      >
        Return to the Collection
      </Link>
    </div>
  )

  return (
    <SeoWrapper pageName={handle || 'product-details'} seoData={product?.seo || null}>
      <main className="bg-ivory">
        {/* Hero spread (12-col, gallery + info) — breadcrumb comes from root layout */}
        <section className="px-4 pt-10 pb-20 lg:px-8">
          <ProductPageClient product={product} />
        </section>

        {/* The Maker's Hand */}
        <Reveal>
          <FeatureHighlight />
        </Reveal>

        {/* Reviews — A Legacy of Trust */}
        <Reveal>
          <section className="bg-white">
            <div className="mx-auto flex max-w-[1320px] flex-col items-center px-4 pt-20 text-center md:pt-28 lg:px-8">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                Testimonials
              </p>
              <h2 className="mt-4 max-w-2xl font-display text-4xl font-normal leading-tight tracking-tight text-brand-black md:text-5xl">
                A Legacy of Trust
              </h2>
              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-brand-black/60">
                Notes from the people who carry this piece.
              </p>
              <span className="mt-6 inline-block h-px w-12 bg-gold/60" aria-hidden />
            </div>
            <ReviewsSection productId={product.id} productName={product.name} initialReviews={initialReviews} initialStats={initialStats} />
          </section>
        </Reveal>

        {/* Complete the Set */}
        <Reveal>
          <CrossSell currentHandle={product.handle} initialBestsellers={initialBestsellers} />
        </Reveal>
      </main>
    </SeoWrapper>
  )
}