import { CollectionsGridSkeleton, PageHeadSkeleton } from '../_components/Skeleton';

/* Collections index while it streams in: the real title, then the tile grid
   (first tile full-width, like the live page). */
export default function Loading() {
  return (
    <>
      <PageHeadSkeleton eyebrow="Curated worlds" title="Our Collections." lede="Each collection tells a story — discover the world of VELMIQUE through its distinct fragrance universes." />
      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <CollectionsGridSkeleton />
      </div>
    </>
  );
}
