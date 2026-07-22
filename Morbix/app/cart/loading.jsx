import { Skeleton } from '@/components/ui/Skeleton';

export default function CartLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <Skeleton width="25%" height={38} />
      <div className="cart-layout" style={{ marginTop: 26 }}>
        <div style={{ display: 'grid', gap: 14 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={108} radius={16} />)}
        </div>
        <Skeleton height={260} radius={24} />
      </div>
    </div>
  );
}
