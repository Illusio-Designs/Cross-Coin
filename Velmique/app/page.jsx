import Hero3DWrapper from '@/components/home/Hero3DWrapper';
import {
  Marquee,
  CollectionsBand,
  StoryBand,
  CollectionBanner,
  BestSellers,
  NotesBand,
  Testimonials,
} from '@/components/home/HomeSections';

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
export default function HomePage() {
  return (
    <>
      <Hero3DWrapper />
      <Marquee />
      <CollectionsBand />
      <StoryBand />
      <CollectionBanner />
      <BestSellers />
      <NotesBand />
      <Testimonials />
    </>
  );
}
