import { Skeleton } from '@/components/ui/Skeleton'

export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-site px-5 py-10 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery skeleton */}
        <div className="flex flex-col gap-3 lg:flex-row-reverse">
          <Skeleton className="aspect-square w-full flex-1 rounded-2xl" />
          <div className="flex gap-2 lg:flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-20 shrink-0 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Info skeleton */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-3/4" />
          </div>
          <Skeleton className="h-6 w-28" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-6 rounded-full" />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-20 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-14 w-full rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  )
}
