import { Skeleton, SkeletonRegion, SkeletonText } from '@/components/ui/Skeleton';

// Article: cover banner at its real height, then the article column beside
// the sidebar — same boxes as ClientPage.
export default function ArticleLoading() {
  return (
    <SkeletonRegion label="Loading article…">
      <section className="relative h-[38vh] max-h-[520px] min-h-[240px] w-full overflow-hidden sm:h-[46vh] md:h-[54vh]" aria-hidden="true">
        <div className="sk absolute inset-0" />
      </section>
      <div className="px-4 py-8 sm:px-5 sm:py-10 md:px-8 lg:px-10" aria-hidden="true">
        <div className="mx-auto max-w-site grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px] lg:gap-10">
          <div>
            <Skeleton className="mb-6 h-3 w-28" />
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="mt-2 h-7 w-1/2" />
            <Skeleton className="mt-6 h-16 w-full rounded-lg" />
            <SkeletonText lines={6} className="mt-8" />
          </div>
          <aside className="hidden lg:block">
            <div className="flex flex-col gap-6">
              <Skeleton className="h-[84px] w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          </aside>
        </div>
      </div>
    </SkeletonRegion>
  );
}
