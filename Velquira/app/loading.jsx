import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-site px-6 py-32 md:px-10 lg:px-16">
      <Skeleton className="mx-auto h-16 w-2/3" />
      <Skeleton className="mx-auto mt-6 h-6 w-1/3" />
    </div>);

}