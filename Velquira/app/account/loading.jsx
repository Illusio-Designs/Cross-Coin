import { SkeletonRegion, AccountDashboardSkeleton } from '@/components/ui/Skeleton';

export default function AccountLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <SkeletonRegion label="Loading your account…">
        <AccountDashboardSkeleton />
      </SkeletonRegion>
    </div>
  );
}
