import Link from 'next/link';
import { OrderListSkeleton } from '@/components/ui/Skeleton';

export default function OrdersLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <nav className="crumbs">
        <Link href="/account">Account</Link> <span>/</span> <b>Orders</b>
      </nav>
      <div className="page-hero"><span className="eyebrow">Account</span><h1>My orders</h1></div>
      <OrderListSkeleton rows={4} style={{ marginTop: 24 }} />
    </div>
  );
}
