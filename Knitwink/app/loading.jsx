import { ProductCardSkeleton, SkeletonRegion } from '@/components/ui/Skeleton';

// Home: hero stage at its real aspect ratio, the four category tiles, then the
// "Most Loved" product rail — the same boxes the page draws.
export default function Loading() {
  return (
    <SkeletonRegion label="Loading Knitwink…">
      <section aria-hidden="true">
        <div className="relative aspect-[4/5] w-full overflow-hidden md:aspect-[16/9]">
          <div className="sk sk--dark absolute inset-0 bg-gray-900" />
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 px-3 py-3 md:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="sk aspect-[3/4] rounded-2xl md:aspect-auto md:min-h-[320px] lg:min-h-[400px]" />
        ))}
      </div>
      <div className="py-6" aria-hidden="true">
        <p className="mb-5 text-center text-sm font-bold uppercase tracking-[0.25em] text-brand-black">Most Loved</p>
        <div className="flex gap-3 overflow-hidden px-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[220px] shrink-0 md:w-[260px]"><ProductCardSkeleton /></div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
