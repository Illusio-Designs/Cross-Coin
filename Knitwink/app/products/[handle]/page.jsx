'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getProduct } from '@/lib/api/products'
import { ProductPageClient } from '@/components/product/ProductPageClient'
import { FeatureBreakdown } from '@/components/product/FeatureBreakdown'
import { CrossSell } from '@/components/product/CrossSell'
import { ReviewsSection } from '@/components/product/ReviewsSection'

function ProductSkeleton() {
  return (
    <div className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-5 py-10 lg:px-8">
      <div className="mx-auto max-w-site grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="aspect-square w-full animate-pulse rounded-2xl bg-gray-100" />
        <div className="flex flex-col gap-4">
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
    <div className="mx-2 mt-2 rounded-2xl bg-white px-5 py-20 text-center text-gray-500">
      Product not found.
    </div>
  )

  return (
    <>
      <section className="bg-white px-5 py-10 lg:px-8">
        <ProductPageClient product={product} />
      </section>

      {product.description && (
        <section className="bg-white px-5 py-10 lg:px-8">
          <div className="mx-auto max-w-site">
            <h2 className="mb-4 text-xl font-semibold text-brand-black">Product Description</h2>
            <p className="text-base leading-relaxed text-gray-600">{product.description}</p>
          </div>
        </section>
      )}

      <section className="bg-off-white">
        <FeatureBreakdown features={product.features} />
      </section>

      <section className="">
        <ReviewsSection productId={product.id} productName={product.name} />
      </section>

      <section className="bg-off-white">
        <CrossSell currentHandle={product.handle} />
      </section>
    </>
  )
}
