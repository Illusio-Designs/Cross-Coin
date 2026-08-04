import { Skeleton } from '@/components/ui/Skeleton';

export default function AccountLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <Skeleton width="30%" height={38} />
      <div className="account-links" style={{ marginTop: 24 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={96} radius={16} />)}
      </div>
    </div>
  );
}
