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
import { getAllReviews } from '@/lib/api/reviews'
import { getPosts } from '@/lib/api/blog'
import SeoWrapper from '@/components/SeoWrapper'
import { buildMetadata } from '@/lib/api/seo'

// Regenerate at most every 5 minutes (ISR). Combined with the server-cached
// fetches below, the homepage is served as static HTML from Vercel's edge and
// re-rendered every 60s so dashboard edits (hero slider etc.) reflect promptly.
export const revalidate = 60

// Server-rendered page SEO from the dashboard-controlled backend. The home page
// carries no hardcoded metadata of its own (the layout supplies the site-wide
// defaults and SeoWrapper handles client-side tags), so the fallback is empty:
// buildMetadata swallows backend errors and returns {} on a miss, leaving the
// layout defaults intact.
export async function generateMetadata() {
  return buildMetadata('home', {})
}

// Fetch the above-the-fold lists on the SERVER and render them into the initial
// HTML. Previously this page was a 'use client' component that fetched sliders,
// categories, and bestsellers in the browser via React Query — so the first
// paint shipped an empty shell and the hero/products only appeared after JS
// downloaded, hydrated, and made three round-trips (a client waterfall that
// wrecked LCP and left crawlers with no content). Now the LCP content is in the
// HTML immediately. The child components stay client components for
// interactivity; they just receive their data as props instead of fetching it.
export default async function HomePage() {
  // Reviews and posts are fetched once here and shared with the components
  // below, so the store-wide reviews request (previously fired twice: by
  // ReviewBand and TrustStrip) and the blog fetch no longer run on the client.
  const [slides, categories, bestsellers, reviews, posts] = await Promise.all([
    getPublicSliders().catch(() => []),
    getPublicCategories().catch(() => []),
    getBestsellers().catch(() => []),
    getAllReviews().catch(() => null),
    getPosts().catch(() => []),
  ])

  // Preload the first slide's hero image (the LCP element). HeroBanner renders
  // it via ShimmerImg as a plain <img src={slide.image}> with NO ImageKit
  // transform, and its initial (server/desktop) src is always slide.image, so
  // we preload that exact raw URL. Rendering <link rel="preload"> here lets
  // Next hoist it into <head>, giving the browser the LCP URL in the initial
  // HTML instead of waiting for the client hero to hydrate.
  const heroImage = slides[0]?.image

  const SITE_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com').replace(/\/+$/, '');
  const homeJsonLd = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Knitwink', url: SITE_URL, logo: `${SITE_URL}/logo.png` },
    {
      '@context': 'https://schema.org', '@type': 'WebSite', name: 'Knitwink', url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <SeoWrapper pageName="home">
      {homeJsonLd.map((obj, i) => (
        <script key={`ld-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      {heroImage && (
        <link rel="preload" as="image" href={heroImage} fetchPriority="high" />
      )}
      {/* Visually-hidden h1 — every page needs exactly one h1 for axe-core
          and screen readers. The hero design has no visible heading, so
          we use the sr-only utility from globals.css. */}
      <h1 className="sr-only">Knitwink — natural-fibre knitwear, made to last</h1>
      <HeroBanner slides={slides} />
      <CategoryCards categories={categories} />
      <ExclusiveSection products={bestsellers.slice(0, 3)} />
      <BestsellerRow products={bestsellers} />
      <ReviewBand reviews={reviews} />
      <BlogStrip posts={posts} />
      <TrustStrip reviews={reviews} />
    </SeoWrapper>
  )
}
