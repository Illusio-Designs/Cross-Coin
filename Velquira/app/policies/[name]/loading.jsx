import { Skeleton, SkeletonRegion, SkeletonText } from '@/components/ui/Skeleton';

export default function PolicyLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero sk-hero">
        <span className="eyebrow">Policy</span>
        <Skeleton width={280} height={38} radius={4} style={{ maxWidth: '80%' }} />
      </div>
      <SkeletonRegion label="Loading policy…" className="article-body" style={{ marginTop: 20 }}>
        <SkeletonText lines={5} />
        <Skeleton width={220} height={20} radius={4} style={{ margin: '28px 0 14px' }} />
        <SkeletonText lines={6} />
      </SkeletonRegion>
    </div>
  );
}
