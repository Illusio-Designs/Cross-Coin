import Link from 'next/link';
import { Skeleton, SkeletonRegion, SkeletonText } from '@/components/ui/Skeleton';

// Article: crumbs stay, then meta line, serif title, 16:9 cover and body copy.
export default function ArticleLoading() {
  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 50 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/journal">Journal</Link> <span>/</span>
        <Skeleton width={140} height={12} radius={3} style={{ display: 'inline-block' }} />
      </nav>
      <SkeletonRegion as="article" className="article" label="Loading article…">
        <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Skeleton width={220} height={11} radius={3} />
          <Skeleton width={620} height={40} radius={4} style={{ maxWidth: '92%' }} />
          <Skeleton width={400} height={40} radius={4} style={{ maxWidth: '70%', marginBottom: 10 }} />
        </div>
        <div className="article-hero" aria-hidden="true" style={{ position: 'relative', aspectRatio: '16 / 9', background: 'none' }}>
          <span className="sk sk-fill" />
        </div>
        <div className="article-body" style={{ marginTop: 22 }}>
          <SkeletonText lines={4} />
          <Skeleton width={260} height={22} radius={4} style={{ margin: '28px 0 14px' }} />
          <SkeletonText lines={5} />
        </div>
      </SkeletonRegion>
    </div>
  );
}
