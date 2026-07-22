import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

export default function ProductsLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <Skeleton width="35%" height={38} />
      <div style={{ height: 26 }} />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
