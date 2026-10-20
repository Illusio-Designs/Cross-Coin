import { PageHeadSkeleton, ShopGridSkeleton } from '../_components/Skeleton';

/* The shop while it streams in: title on screen, then collection chips,
   the count / filters / sort toolbar and the 4-up card grid. */
export default function Loading() {
  return (
    <>
      <PageHeadSkeleton eyebrow="The collection" title="Signature Scents." lede="Distinctly crafted, unmistakably you — explore every VELMIQUE fragrance." />
      <ShopGridSkeleton />
    </>
  );
}
