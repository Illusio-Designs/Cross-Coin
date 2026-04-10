import type { Metadata } from 'next'
import { HeroBanner } from '@/components/home/HeroBanner'
import { CollectionGrid } from '@/components/home/CollectionGrid'
import { SustainabilityStrip } from '@/components/home/SustainabilityStrip'
import { BestsellerRow } from '@/components/home/BestsellerRow'
import { ExclusivePair } from '@/components/home/ExclusivePair'
import { BlogStrip } from '@/components/home/BlogStrip'
import { ReviewBand } from '@/components/home/ReviewBand'
import { InstagramStrip } from '@/components/home/InstagramStrip'
import { getFeaturedCollections, getBestsellers } from '@/lib/api/products'
import { getPublicSliders } from '@/lib/api/sliders'
import { getPublicCategories } from '@/lib/api/categories'
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
  const [collections, bestsellers, slides, categories] = await Promise.allSettled([
    getFeaturedCollections(),
    getBestsellers(),
    getPublicSliders(),
    getPublicCategories(),
  ])

  return (
    <>
      <HeroBanner slides={slides.status === 'fulfilled' ? slides.value : []} />
      <CollectionGrid
        collections={collections.status === 'fulfilled' ? collections.value : undefined}
        categories={categories.status === 'fulfilled' ? categories.value : []}
      />
      <SustainabilityStrip />
      <BestsellerRow
        products={bestsellers.status === 'fulfilled' ? bestsellers.value : undefined}
      />
      <ExclusivePair />
      <BlogStrip />
      <ReviewBand />
      <InstagramStrip />
    </>
  )
}
