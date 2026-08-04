import { Skeleton } from '@/components/ui/Skeleton';

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
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div className="hidden gap-2 md:flex">
          {Array.from({ length: 5 }).map((_, i) =>
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
          )}
        </div>
        <Skeleton className="h-8 w-28 rounded-full md:hidden" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Grid skeleton — inlined since components/collection/ProductGrid
          doesn't exist. Mirrors ProductCard footprint: square image bed +
          two caption lines. */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 py-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>);

}