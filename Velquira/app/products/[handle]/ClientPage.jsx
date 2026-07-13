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
    <div className="bg-beige pt-10 pb-24">
      <div className="vq-container grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="aspect-square w-full animate-pulse bg-cream lg:col-span-7" />
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="h-3 w-24 animate-pulse bg-cream" />
          <div className="h-10 w-3/4 animate-pulse bg-cream" />
          <div className="h-7 w-28 animate-pulse bg-cream" />
          <div className="h-px w-full bg-line" />
          <div className="h-14 w-full animate-pulse bg-cream" />
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
    <div className="bg-beige py-32">
      <div className="vq-container text-center">
        <p className="vq-display text-[clamp(2rem,4vw,3rem)] text-ink">Product not found.</p>
        <Link
          href="/collections/all"
          className="mt-8 inline-block rounded-full bg-[#1e1912] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-black"
        >
          Back to Products
        </Link>
      </div>
    </div>
  )

  return (
    <SeoWrapper pageName={handle || 'product-details'} seoData={product?.seo || null}>
      <main className="bg-cream">
        {/* Main buy block — gallery + buy column. Breadcrumb comes from root layout */}
        <section className="bg-beige pt-8 pb-20 md:pb-28">
          <div className="vq-container">
            <ProductPageClient product={product} />
          </div>
        </section>

        {/* How it's made */}
        <Reveal>
          <FeatureHighlight />
        </Reveal>

        {/* You may also like */}
        <Reveal>
          <CrossSell currentHandle={product.handle} initialBestsellers={initialBestsellers} />
        </Reveal>

        {/* Customer reviews */}
        <Reveal>
          <section className="bg-cream pt-[clamp(64px,9vw,116px)]">
            <div className="vq-container">
              <div className="mb-12 md:mb-16">
                <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Testimonials</p>
                <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
                  Customer Reviews <span className="text-gold">✦</span>
                </h2>
                <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
              </div>
            </div>
            <ReviewsSection productId={product.id} productName={product.name} initialReviews={initialReviews} initialStats={initialStats} />
          </section>
        </Reveal>
      </main>
    </SeoWrapper>
  )
}