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

// Regenerate the homepage at most every 5 minutes (ISR) so it stays fast and
// fresh without re-fetching on every request.
export const revalidate = 300;

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

  return (
    <SeoWrapper pageName="home">
      <HeroMaison />
      <Marquee />
      <Intro />
      <BestSellers initialItems={bestsellers} />
      <CollectionsBand initialCategories={categories} />
      <StoryBand />
      <NotesBand />
      <CollectionBanner />
      <Testimonials initialReviews={reviewsData?.reviews || []} initialTotal={reviewsData?.pagination?.total || 0} />
    </SeoWrapper>
  );
}
