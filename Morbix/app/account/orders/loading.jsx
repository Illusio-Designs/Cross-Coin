import { Skeleton } from '@/components/ui/Skeleton';

export default function OrdersLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <Skeleton width="30%" height={38} />
      <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} height={72} radius={14} />)}
      </div>
    </div>
  );
}
