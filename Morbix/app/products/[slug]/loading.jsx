import Link from 'next/link';
import { Skeleton, PdpSkeleton, ReviewsSkeleton } from '@/components/ui/Skeleton';

// Product page while it loads: breadcrumbs stay, the gallery reserves the real
// 1:1 main image + thumbnails, the buy panel and reviews show their shapes.
export default function ProductLoading() {
  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 20 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/products">Shop</Link> <span>/</span> <span>…</span> <span>/</span> <Skeleton width={140} height={12} />
      </nav>
      <PdpSkeleton />
      <ReviewsSkeleton withButton />
    </div>
  );
}
