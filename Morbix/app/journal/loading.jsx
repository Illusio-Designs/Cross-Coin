import { Skeleton } from '@/components/ui/Skeleton';

export default function JournalLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <Skeleton width="35%" height={38} />
      <div className="blog-grid" style={{ marginTop: 26 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} height={320} radius={20} />)}
      </div>
    </div>
  );
}
