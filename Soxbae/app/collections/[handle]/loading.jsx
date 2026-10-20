import Link from 'next/link';
import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

export default function CollectionLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/collections">Collections</Link> <span>/</span> <Skeleton width={90} height={12} />
      </nav>
      <div className="page-hero">
        <span className="eyebrow">Collection</span>
        <Skeleton width={260} height={40} radius={10} style={{ margin: '10px 0 12px' }} />
        <Skeleton width={200} height={14} />
      </div>
      <ProductGridSkeleton count={8} style={{ marginTop: 24 }} />
    </div>
  );
}
