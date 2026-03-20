import type { Metadata } from 'next'
import { HeroBanner } from '@/components/home/HeroBanner'
import { CollectionGrid } from '@/components/home/CollectionGrid'
import { SustainabilityStrip } from '@/components/home/SustainabilityStrip'
import { BestsellerRow } from '@/components/home/BestsellerRow'
import { MaterialSection } from '@/components/home/MaterialSection'
import { ReviewBand } from '@/components/home/ReviewBand'
import { InstagramStrip } from '@/components/home/InstagramStrip'
import { getFeaturedCollections, getBestsellers, getMaterials } from '@/lib/api/products'
import { SITE_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: SITE_NAME,
  description: 'Natural materials. Thoughtful design. A better footprint.',
  openGraph: {
    title: SITE_NAME,
    description: 'Natural materials. Thoughtful design. A better footprint.',
    images: [{ url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80' }],
  },
}

export default async function HomePage() {
  // Fetch in parallel — gracefully fall back to undefined if API is down
  const [collections, bestsellers, materials] = await Promise.allSettled([
    getFeaturedCollections(),
    getBestsellers(),
    getMaterials(),
  ])

  return (
    <>
      <HeroBanner />
      <CollectionGrid
        collections={collections.status === 'fulfilled' ? collections.value : undefined}
      />
      <SustainabilityStrip />
      <BestsellerRow
        products={bestsellers.status === 'fulfilled' ? bestsellers.value : undefined}
      />
      <MaterialSection
        materials={materials.status === 'fulfilled' ? materials.value : undefined}
      />
      <ReviewBand />
      <InstagramStrip />
    </>
  )
}
