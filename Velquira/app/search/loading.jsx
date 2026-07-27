import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

export default function SearchLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <Skeleton width="40%" height={38} />
      <div style={{ height: 20 }} />
      <Skeleton height={48} radius={999} width={520} style={{ maxWidth: '100%' }} />
      <div style={{ height: 26 }} />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
