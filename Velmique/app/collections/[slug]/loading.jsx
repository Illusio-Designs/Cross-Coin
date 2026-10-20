import { PageHeadSkeleton, ShopGridSkeleton } from '../../_components/Skeleton';

/* One collection while it streams in: its name/description aren't known
   yet (bars), then the same chips / toolbar / grid as the shop. */
export default function Loading() {
  return (
    <>
      <PageHeadSkeleton />
      <ShopGridSkeleton />
    </>
  );
}
