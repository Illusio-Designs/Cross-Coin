import HeroMaison from '@/components/home/HeroMaison';
import SeoWrapper from '@/components/SeoWrapper';
import {
  Marquee,
  Intro,
  CollectionsBand,
  StoryBand,
  CollectionBanner,
  BestSellers,
  NotesBand,
  Testimonials,
} from '@/components/home/HomeSections';
import { getPublicCategories } from '@/lib/api/categories';
import { getBestsellers } from '@/lib/api/products';
import { getAllReviews } from '@/lib/api/reviews';
import { buildMetadata } from '@/lib/api/seo';

// Server-rendered, dashboard-controlled backend SEO ('home'). No hardcoded
// fallback here, so an empty backend row simply falls back to the root
// layout's metadata. (SeoWrapper still refreshes these client-side.)
export async function generateMetadata() {
  return buildMetadata('home', {});
}

// Regenerate the homepage at most every 1 minute (ISR) so it stays fast and
// fresh without re-fetching on every request.
export const revalidate = 60;

/* Homepage flow (maison de parfum layout):
   1. Hero               — static "Wear your presence." product-shot hero
   2. Marquee            — italic serif strip on near-black
   3. Intro              — "A fragrance should become part of you."
   4. Signature Collection — live best-seller product grid (API)
   5. Shop by Collection — live categories (API)
   6. Story              — split image + dark "slow perfume" panel
   7. Composition        — four acts / notes grid
   8. Statement          — parallax "Rare ingredients. Quiet confidence."
   9. Reviews            — real customer stories, 3-up grid (API)
*/
export default async function HomePage() {
  // Fetch the above/below-the-fold data on the server, in parallel, so the
  // homepage HTML ships with content instead of a client-side waterfall of
  // skeletons. Each falls back to empty so one slow call can't blank the page.
  const [categories, bestsellers, reviewsData] = await Promise.all([
    getPublicCategories().catch(() => []),
    getBestsellers(4).catch(() => []),
    getAllReviews({ limit: 24 }).catch(() => ({ reviews: [] })),
  ]);

  // Real store-wide rating for the trust marquee — average from the fetched
  // reviews, exact total from the API. Null when there are no real reviews.
  const homeReviews = reviewsData?.reviews || [];
  const ratedReviews = homeReviews.filter((r) => Number(r.rating) > 0);
  const reviewAvg = ratedReviews.length
    ? ratedReviews.reduce((a, r) => a + Number(r.rating), 0) / ratedReviews.length
    : 0;
  const reviewTotal = Number(reviewsData?.pagination?.total) || 0;
  const marqueeRating = reviewAvg > 0 && reviewTotal > 0
    ? { avg: reviewAvg, total: reviewTotal }
    : null;

  const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://velmique.co.in').replace(/\/+$/, '');
  const homeJsonLd = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Velmique', url: SITE_URL, logo: `${SITE_URL}/logo.png` },
    {
      '@context': 'https://schema.org', '@type': 'WebSite', name: 'Velmique', url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <>
      {homeJsonLd.map((obj, i) => (
        <script key={`ld-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      {/* Preload the LCP hero image so the browser discovers it immediately
          (fixes Lighthouse "LCP request discovery"). HeroMaison renders this
          exact local asset as its <img src> — keep the href in sync with the
          default `image` prop in components/home/HeroMaison.jsx. Next hoists
          this <link> into <head>. */}
      <link rel="preload" as="image" fetchPriority="high" href="/perfumehero.webp" />
      <SeoWrapper pageName="home">
        <HeroMaison />
        <Marquee rating={marqueeRating} />
        <Intro />
        <BestSellers initialItems={bestsellers} />
        <CollectionsBand initialCategories={categories} />
        <StoryBand />
        <NotesBand />
        <CollectionBanner />
        <Testimonials initialReviews={reviewsData?.reviews || []} initialTotal={reviewsData?.pagination?.total || 0} />
      </SeoWrapper>
    </>
  );
}
