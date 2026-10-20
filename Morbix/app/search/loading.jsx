import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

export default function SearchLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Search</span>
        <Skeleton width={280} height={40} radius={10} style={{ margin: '10px 0 12px' }} />
      </div>
      <Skeleton height={62} radius={999} width={520} style={{ margin: '20px 0 8px' }} />
      <ProductGridSkeleton count={5} label="Searching…" style={{ marginTop: 18 }} />
    </div>
  );
}
