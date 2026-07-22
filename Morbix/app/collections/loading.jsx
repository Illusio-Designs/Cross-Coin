import { Skeleton } from '@/components/ui/Skeleton';

export default function CollectionsLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <Skeleton width="40%" height={38} />
      <div className="cat-grid" style={{ marginTop: 26 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={200} radius={24} />)}
      </div>
    </div>
  );
}
