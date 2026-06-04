'use client'

// Client subtree of /products/[handle]. The route file (page.jsx) is a
// server component that handles generateMetadata + JSON-LD; this file
// owns all the interactive state (gallery, qty, cart, wishlist).

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getProduct } from '@/lib/api/products'
import { ProductPageClient } from '@/components/product/ProductPageClient'
import dynamic from 'next/dynamic'
// Below-the-fold sections: code-split so the gallery + ATC render
// first. The skeletons keep the page from jumping when each chunk
// arrives. ssr:false on CrossSell because it relies on cart state.
const FeatureHighlight = dynamic(() => import('@/components/product/FeatureHighlight').then(m => m.FeatureHighlight), {
  loading: () => <div className="h-96 w-full animate-pulse bg-gray-50" />,
})
const ReviewsSection = dynamic(() => import('@/components/product/ReviewsSection').then(m => m.ReviewsSection), {
  loading: () => <div className="my-12 h-80 w-full animate-pulse rounded-2xl bg-gray-50" />,
})
const CrossSell = dynamic(() => import('@/components/product/CrossSell').then(m => m.CrossSell), {
  loading: () => <div className="my-12 h-72 w-full animate-pulse rounded-2xl bg-gray-50" />,
  ssr: false,
})
import SeoWrapper from '@/components/SeoWrapper'

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

export default function ProductDetailClient() {
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

  // JSON-LD: Product schema + BreadcrumbList so Google can render the
  // page as a rich result. Self-generated content from our DB; not user
  // HTML, so it intentionally bypasses DOMPurify.
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com'
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: (product.images || []).map((i) => i?.image_url || i).filter(Boolean).slice(0, 6),
    sku: product.sku || product.id,
    brand: { '@type': 'Brand', name: 'Knitwink' },
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/products/${handle}`,
      priceCurrency: 'INR',
      price: product.price ?? product.variations?.[0]?.price ?? 0,
      availability: product.inStock !== false
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Collections', item: `${siteUrl}/collections` },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${siteUrl}/products/${handle}` },
    ],
  }

  return (
    <SeoWrapper pageName={handle || 'product-details'} seoData={product?.seo || null}>
      {/* JSON-LD lives in page.jsx (server-rendered). The duplicate here is
          a fallback for client-side navigations from another route. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Gallery + Info */}
      <div className="px-4 pt-40 pb-8 sm:pt-36 lg:px-8 lg:pt-30">
        <ProductPageClient product={product} />
      </div>

      {/* Description */}
      {product.description && (
        <section className="bg-white">
          <div className="mx-auto max-w-site grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr]">
            {/* Text */}
            <div className="flex flex-col justify-center px-4 py-10 sm:px-6 sm:py-12 lg:px-4 lg:py-24">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Why We Love This</p>
              <p className="mt-5 text-sm leading-[1.85] text-gray-800 text-justify">{product.description}</p>

              {/* Best For */}
              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Best For</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {['Everyday Wear', 'Walking', 'Office', 'Travel'].map(tag => (
                    <span key={tag} className="rounded-full border border-gray-300 px-3 py-1 text-[10px] font-medium text-gray-800 sm:px-4 sm:py-1.5 sm:text-[11px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mobile key points */}
              <div className="mt-8 lg:hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Thoughtfully Designed</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {['Anti-microbial properties for all-day freshness', 'Elastane welt for a no-sag, snug grip', 'Full body stretch for the perfect fit', 'Machine washable — easy care, every time'].map(t => (
                    <li key={t} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-black" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Center image — larger with double circles */}
            {product.images?.[1]?.url && (
              <div className="flex items-center justify-center py-6 sm:py-8 lg:px-8 lg:py-0">
                <div className="relative flex items-center justify-center w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] lg:w-[350px] lg:h-[350px]">
                  <div className="absolute inset-0 rounded-full border border-gray-300" />
                  <div className="absolute inset-3 rounded-full border border-gray-200" />
                  <img src={product.images[1].url} alt={product.name} className="relative h-[210px] w-[210px] rounded-full object-cover sm:h-[250px] sm:w-[250px] lg:h-[300px] lg:w-[300px]" />
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
    </SeoWrapper>
  )
}
