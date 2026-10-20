import Link from 'next/link';
import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

export default function CollectionLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/collections">Collections</Link> <span>/</span>
        <Skeleton width={90} height={12} radius={3} style={{ display: 'inline-block' }} />
      </nav>
      <div className="page-hero sk-hero">
        <span className="eyebrow">Collection</span>
        <Skeleton width={260} height={38} radius={4} style={{ maxWidth: '80%' }} />
        <Skeleton width={210} height={13} radius={4} />
      </div>
      <ProductGridSkeleton count={8} style={{ marginTop: 24 }} />
    </div>
  );
}
