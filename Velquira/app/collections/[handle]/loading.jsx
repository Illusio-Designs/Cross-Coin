import { Skeleton } from '@/components/ui/Skeleton';
import { ProductGridSkeleton } from '@/components/collection/ProductGrid';

export default function CollectionLoading() {
  return (
    <div className="mx-auto max-w-site px-6 md:px-10 lg:px-16">
      {/* Header skeleton */}
      <div className="flex flex-col items-center gap-3 pb-8 pt-16">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Controls skeleton */}
      <div className="flex items-center justify-between border-b border-line pb-6">
        <div className="hidden gap-2 md:flex">
          {Array.from({ length: 5 }).map((_, i) =>
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
          )}
        </div>
        <Skeleton className="h-8 w-28 rounded-full md:hidden" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Grid skeleton */}
      <div className="py-8">
        <ProductGridSkeleton />
      </div>
    </div>);

}