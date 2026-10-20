import Link from 'next/link';
import { Skeleton, SkeletonRegion, OrderDetailSkeleton } from '@/components/ui/Skeleton';

export default function OrderDetailLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <nav className="crumbs">
        <Link href="/account">Account</Link> <span>/</span> <Link href="/account/orders">Orders</Link> <span>/</span>
        <Skeleton width={90} height={12} radius={3} style={{ display: 'inline-block' }} />
      </nav>
      <SkeletonRegion label="Loading order…">
        <div className="account-head" aria-hidden="true">
          <div className="page-hero sk-hero" style={{ marginBottom: 18 }}>
            <span className="eyebrow">Order</span>
            <Skeleton width={220} height={38} radius={4} />
            <Skeleton width={110} height={13} radius={4} />
          </div>
          <Skeleton width={90} height={24} radius={999} />
        </div>
        <OrderDetailSkeleton />
      </SkeletonRegion>
    </div>
  );
}
