import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton'

// Product page while it loads — same wrapper, columns and boxes as
// ClientPage → ProductPageClient: square main photo + 2-column photo grid on
// the left, the white info card (collection pill, title, rating, price,
// colours, quantity, buttons) on the right.
export function ProductPageSkeleton() {
  return (
    <SkeletonRegion label="Loading product…" className="px-4 pt-40 pb-8 sm:pt-36 lg:px-8 lg:pt-30">
      <div className="mx-auto max-w-site grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="relative aspect-square overflow-hidden rounded-2xl"><div className="sk absolute inset-0" /></div>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl"><div className="sk absolute inset-0" /></div>
            ))}
          </div>
        </div>
        <div className="min-w-0 lg:sticky lg:top-[110px] lg:self-start">
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-2 h-8 w-32" />
            <div className="flex gap-2 pt-2">
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-8 rounded-full" />)}
            </div>
            <Skeleton className="h-10 w-28 rounded-full" />
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-12 flex-1 rounded-full" />
              <Skeleton className="h-12 flex-1 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  )
}

/** Placeholder for a below-the-fold section while its code chunk loads. */
export function SectionSkeleton({ className = 'h-80' }) {
  return (
    <div className={`px-4 py-10 sm:px-6 lg:px-8`} aria-hidden="true">
      <Skeleton className={`w-full rounded-2xl ${className}`} />
    </div>
  )
}
