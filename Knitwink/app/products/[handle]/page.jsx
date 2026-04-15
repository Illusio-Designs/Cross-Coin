'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getProduct } from '@/lib/api/products'
import { ProductPageClient } from '@/components/product/ProductPageClient'
import { FeatureHighlight } from '@/components/product/FeatureHighlight'
import { CrossSell } from '@/components/product/CrossSell'
import { ReviewsSection } from '@/components/product/ReviewsSection'

function ProductSkeleton() {
  return (
    <div className="bg-white px-5 pt-4 pb-10 lg:px-8">
      <div className="mx-auto max-w-site grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="aspect-square w-full animate-pulse rounded-2xl bg-gray-100" />
        <div className="flex flex-col gap-4 py-6">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-gray-100" />
          <div className="h-6 w-28 animate-pulse rounded bg-gray-100" />
          <div className="h-12 w-full animate-pulse rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  )
}

export default function ProductPage() {
  const { handle } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!handle) return
    setLoading(true)
    getProduct(handle)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [handle])

  if (loading) return <ProductSkeleton />
  if (!product) return (
    <div className="px-5 py-20 text-center text-gray-500">Product not found.</div>
  )

  return (
    <>
      {/* Gallery + Info */}
      <div className="px-4 pt-30 pb-8 lg:px-8">
        <ProductPageClient product={product} />
      </div>

      {/* Description */}
      {product.description && (
        <section className="bg-white">
          <div className="mx-auto max-w-site grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr]">
            {/* Text */}
            <div className="flex flex-col justify-center px-8 py-12 lg:px-4 lg:py-24">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Why We Love This</p>
              <p className="mt-5 text-sm leading-[1.85] text-gray-800">{product.description}</p>
            </div>
            {/* Center image — larger with double circles */}
            {product.images?.[1]?.url && (
              <div className="hidden items-center justify-center px-8 lg:flex">
                <div className="relative flex items-center justify-center" style={{ width: 350, height: 350 }}>
                  <div className="absolute inset-0 rounded-full border border-gray-300" />
                  <div className="absolute inset-3 rounded-full border border-gray-200" />
                  <img src={product.images[1].url} alt={product.name} className="relative h-[300px] w-[300px] rounded-full object-cover" />
                </div>
              </div>
            )}
            {/* Right — key points */}
            <div className="hidden flex-col justify-center gap-4 px-8 py-12 lg:flex lg:px-12 lg:py-16">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Thoughtfully Designed</p>
              <ul className="flex flex-col gap-3 mt-2">
                {['Anti-microbial properties for all-day freshness', 'Elastane welt for a no-sag, snug grip', 'Full body stretch for the perfect fit', 'Machine washable — easy care, every time'].map(t => (
                  <li key={t} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-black" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Feature Highlight — last image of first variation in center circle */}
      {(() => {
        const firstColor = product.colors?.[0]?.name
        const colorImgs = firstColor && product.colorImages?.[firstColor]
        const imgs = colorImgs?.length ? colorImgs : product.images || []
        const lastImg = imgs[imgs.length - 1]?.url
        return lastImg ? <FeatureHighlight imageUrl={lastImg} productName={product.name} /> : null
      })()}

      {/* Reviews */}
      <ReviewsSection productId={product.id} productName={product.name} />

      {/* Cross-sell */}
        <CrossSell currentHandle={product.handle} />
    </>
  )
}
