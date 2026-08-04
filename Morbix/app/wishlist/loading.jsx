import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

export default function WishlistLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <Skeleton width="30%" height={38} />
      <div style={{ height: 26 }} />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
