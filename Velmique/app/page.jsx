import Hero3DWrapper from '@/components/home/Hero3DWrapper';
import SeoWrapper from '@/components/SeoWrapper';
import {
  Marquee,
  CollectionsBand,
  StoryBand,
  CollectionBanner,
  BestSellers,
  NotesBand,
  Testimonials,
} from '@/components/home/HomeSections';
import { getPublicSliders } from '@/lib/api/sliders';
import { getPublicCategories } from '@/lib/api/categories';
import { getBestsellers } from '@/lib/api/products';
import { getAllReviews } from '@/lib/api/reviews';

// Regenerate the homepage at most every 5 minutes (ISR) so it stays fast and
// fresh without re-fetching on every request.
export const revalidate = 300;

/* Homepage flow:
   1. Hero slider               — backend-driven banner
   2. Press strip               — "As Featured In" marquee
   3. Collections                — shop-by-collection cards (API)
   4. About / Story              — the maison story
   5. Editorial typography band  — "RARE ABSOLUTES, UNFORGETTABLE SILLAGE,
                                    BOTTLED BY HAND"
   6. Best sellers               — product grid (API)
   7. Fragrance formula          — numbered ingredient layers
   8. Real customer stories      — testimonial grid
*/
export default async function HomePage() {
  // Fetch the above/below-the-fold data on the server, in parallel, so the
  // homepage HTML ships with content instead of a client-side waterfall of
  // skeletons. Each falls back to empty so one slow call can't blank the page.
  const [slides, categories, bestsellers, reviewsData] = await Promise.all([
    getPublicSliders().catch(() => []),
    getPublicCategories().catch(() => []),
    getBestsellers(4).catch(() => []),
    getAllReviews({ limit: 24 }).catch(() => ({ reviews: [] })),
  ]);

  return (
    <SeoWrapper pageName="home">
      <Hero3DWrapper initialSlides={slides} />
      <Marquee />
      <CollectionsBand initialCategories={categories} />
      <StoryBand />
      <CollectionBanner />
      <BestSellers initialItems={bestsellers} />
      <NotesBand />
      <Testimonials initialReviews={reviewsData?.reviews || []} />
    </SeoWrapper>
  );
}
