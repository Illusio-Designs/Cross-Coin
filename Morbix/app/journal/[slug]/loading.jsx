import Link from 'next/link';
import { Skeleton, SkeletonRegion, TextSkeleton } from '@/components/ui/Skeleton';

export default function ArticleLoading() {
  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 50 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/journal">Journal</Link> <span>/</span> <Skeleton width={160} height={12} />
      </nav>
      <SkeletonRegion label="Loading article…" className="article">
        <div className="blog-meta" style={{ justifyContent: 'center' }} aria-hidden="true">
          <Skeleton width={70} height={10} /><Skeleton width={80} height={10} />
        </div>
        <div aria-hidden="true" style={{ display: 'grid', justifyItems: 'center', gap: 12, margin: '14px 0 24px' }}>
          <Skeleton width="70%" height={36} radius={10} />
          <Skeleton width="45%" height={36} radius={10} />
        </div>
        <div className="article-hero" aria-hidden="true"><span className="sk sk-fill" /></div>
        <div className="article-body" aria-hidden="true" style={{ marginTop: 24 }}>
          <TextSkeleton lines={7} label={null} />
        </div>
      </SkeletonRegion>
    </div>
  );
}
