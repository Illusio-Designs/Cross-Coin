import { cn } from '@/lib/utils';





export function Skeleton({ className }) {
  // bg-gray-200 instead of gray-100 — gray-100 is so close to white
  // that the pulse animation is barely visible on a white page
  // background. gray-200 still reads as a subtle skeleton but is
  // unambiguously gray.
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      aria-hidden="true" />);


}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[4/5] w-full md:aspect-[3/4]" />
      <div className="flex gap-1.5">
        {[...Array(4)].map((_, i) =>
        <Skeleton key={i} className="h-4 w-4 rounded-full" />
        )}
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/4" />
    </div>);

}