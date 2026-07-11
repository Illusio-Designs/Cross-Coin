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

// Regenerate at most every 5 minutes (ISR). Combined with the server-cached
// fetches below, the homepage is served as static HTML from Vercel's edge and
// only re-rendered every 5 min instead of on every request.
export const revalidate = 300

// Fetch the above-the-fold lists on the SERVER and render them into the initial
// HTML. Previously this page was a 'use client' component that fetched sliders,
// categories, and bestsellers in the browser via React Query — so the first
// paint shipped an empty shell and the hero/products only appeared after JS
// downloaded, hydrated, and made three round-trips (a client waterfall that
// wrecked LCP and left crawlers with no content). Now the LCP content is in the
// HTML immediately. The child components stay client components for
// interactivity; they just receive their data as props instead of fetching it.
export default async function HomePage() {
  const [slides, categories, bestsellers] = await Promise.all([
    getPublicSliders().catch(() => []),
    getPublicCategories().catch(() => []),
    getBestsellers().catch(() => []),
  ])

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
