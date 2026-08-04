import { Skeleton } from '@/components/ui/Skeleton';

export default function ArticleLoading() {
  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 50, maxWidth: 780 }}>
      <Skeleton width="50%" height={16} />
      <div style={{ height: 24 }} />
      <Skeleton width="80%" height={40} />
      <div style={{ height: 24 }} />
      <Skeleton height={16} /><div style={{ height: 8 }} />
      <Skeleton height={16} /><div style={{ height: 8 }} />
      <Skeleton width="90%" height={16} />
    </div>
  );
}
