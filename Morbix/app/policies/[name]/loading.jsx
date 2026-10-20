import { Skeleton, TextSkeleton } from '@/components/ui/Skeleton';

export default function PolicyLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Policy</span>
        <Skeleton width={300} height={40} radius={10} style={{ margin: '10px 0 12px' }} />
      </div>
      <div className="article-body" style={{ marginTop: 20, maxWidth: 780 }}>
        <TextSkeleton lines={10} label="Loading policy…" />
      </div>
    </div>
  );
}
