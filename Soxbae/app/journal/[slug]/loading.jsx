import Link from 'next/link';
import { Skeleton, SkeletonRegion, TextSkeleton } from '@/components/ui/Skeleton';

export default function ArticleLoading() {
  return (
    <div className="container sx-article" style={{ paddingTop: 24, paddingBottom: 56 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/journal">Journal</Link> <span>/</span> <Skeleton width={160} height={12} />
      </nav>
      <SkeletonRegion label="Loading article…">
        <header className="sx-article-head" aria-hidden="true">
          <Skeleton width={90} height={11} radius={5} />
          <div className="sk-stack" style={{ gap: 12, margin: '14px 0 18px' }}>
            <Skeleton width="75%" height={46} />
            <Skeleton width="45%" height={46} />
          </div>
          <div className="sk-row"><Skeleton circle height={28} /><Skeleton width={90} height={13} /><Skeleton width={80} height={13} /></div>
        </header>
        <div className="sx-article-hero" aria-hidden="true"><span className="sk sk-fill" /></div>
        <div className="sx-article-grid" aria-hidden="true">
          <div className="sx-article-body"><TextSkeleton lines={8} label={null} /></div>
          <aside className="sx-article-aside">
            <div className="sx-article-card sk-stack" style={{ gap: 12 }}>
              <Skeleton width={80} height={10} />
              <div className="sk-row"><Skeleton circle height={34} /><Skeleton width={100} height={14} /></div>
            </div>
          </aside>
        </div>
      </SkeletonRegion>
    </div>
  );
}
