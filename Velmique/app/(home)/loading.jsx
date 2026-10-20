import { NoteOrbsSkeleton, ProductCardSkeleton, ProductGridSkeleton, SkRegion } from '../_components/Skeleton';
import { HeroCopy, FEATURED_HEAD, NOTES_HEAD } from './homeCopy';

/* Home while it streams in: the real hero copy with the #1-bestseller card
   as a skeleton, then the featured grid and the note orbs. Lives in the
   (home) route group so other routes never fall back to the home shape. */
export default function Loading() {
  return (
    <>
      <section className="m-hero">
        <div className="m-wrap m-hero__grid">
          <HeroCopy />
          <div className="m-hero__figure m-hero__figure--card">
            <SkRegion label="Loading our bestseller…" className="m-herocard">
              <ProductCardSkeleton />
            </SkRegion>
          </div>
        </div>
        <div className="m-hero__aside">More than a fragrance.<br />A feeling.</div>
      </section>

      <section className="m-section"><div className="m-wrap">
        {FEATURED_HEAD}
        <ProductGridSkeleton label="Loading featured fragrances…" />
      </div></section>

      <section className="m-section" style={{ paddingTop: 0 }}><div className="m-wrap">
        {NOTES_HEAD}
        <SkRegion label="Loading fragrance notes…"><NoteOrbsSkeleton /></SkRegion>
      </div></section>
    </>
  );
}
