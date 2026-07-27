import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

export default function HomeLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <Skeleton height={360} radius={24} />
      <div style={{ height: 40 }} />
      <Skeleton width="30%" height={26} />
      <div style={{ height: 20 }} />
      <ProductGridSkeleton count={5} />
    </div>
  );
}
