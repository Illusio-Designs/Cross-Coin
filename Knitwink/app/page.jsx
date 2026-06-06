'use client'

import { useQuery } from '@tanstack/react-query'
import { HeroBanner } from '@/components/home/HeroBanner'
import { CategoryCards } from '@/components/home/CategoryCards'
import { TrustStrip } from '@/components/home/TrustStrip'
import { ExclusiveSection } from '@/components/home/ExclusiveSection'
import { BestsellerRow } from '@/components/home/BestsellerRow'
import { ReviewBand } from '@/components/home/ReviewBand'
import { BlogStrip } from '@/components/home/BlogStrip'
import { getBestsellers } from '@/lib/api/products'
import { getPublicSliders } from '@/lib/api/sliders'
import { getPublicCategories } from '@/lib/api/categories'
import SeoWrapper from '@/components/SeoWrapper'
import { queryKeys } from '@/lib/queryClient'

export default function HomePage() {
  // React Query: home-page lists. All three are cacheable for 5 minutes
  // by default. The .catch keeps the page rendering even if one of the
  // backend calls fails (e.g. sliders missing on a fresh deploy).
  const { data: slides = [] } = useQuery({
    queryKey: queryKeys.sliders,
    queryFn: () => getPublicSliders().catch(() => []),
  })
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => getPublicCategories().catch(() => []),
  })
  const { data: bestsellers = [] } = useQuery({
    queryKey: ['bestsellers'],
    queryFn: () => getBestsellers().catch(() => []),
  })

  return (
    <SeoWrapper pageName="home">
      {/* Visually-hidden h1 — every page needs exactly one h1 for axe-core
          and screen readers. The hero design has no visible heading, so
          we use the sr-only utility from globals.css. */}
      <h1 className="sr-only">Knitwink — natural-fibre knitwear, made to last</h1>
      <HeroBanner slides={slides} />
      <CategoryCards categories={categories} />
      <ExclusiveSection products={bestsellers.slice(0, 3)} />
      <BestsellerRow products={bestsellers} />
      <ReviewBand />
      <BlogStrip />
      <TrustStrip />
    </SeoWrapper>
  )
}
