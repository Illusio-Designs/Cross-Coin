import Link from 'next/link';
import { OrderListSkeleton } from '@/components/ui/Skeleton';

export default function ReturnsLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <nav className="crumbs"><Link href="/account">Account</Link> <span>/</span> <b>Returns</b></nav>
      <div className="page-hero"><span className="eyebrow">Account</span><h1>Returns &amp; refunds</h1></div>
      <OrderListSkeleton rows={3} label="Loading your returns…" style={{ marginTop: 20 }} />
    </div>
  );
}
