import { Skeleton } from '@/components/ui/Skeleton';

export default function ProductLoading() {
  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <Skeleton width="45%" height={16} />
      <div className="pdp" style={{ marginTop: 22 }}>
        <Skeleton height={460} radius={24} />
        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <Skeleton width="30%" height={14} />
          <Skeleton width="70%" height={34} />
          <Skeleton width="40%" height={24} />
          <Skeleton height={90} radius={12} />
          <Skeleton height={52} radius={999} />
        </div>
      </div>
    </div>
  );
}
