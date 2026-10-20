import { DarkHeroSkeleton, SkeletonRegion } from '@/components/ui/Skeleton';

// Policy: the black "Legal" hero, then the policy text lines.
export default function PolicyLoading() {
  return (
    <>
      <DarkHeroSkeleton />
      <section className="bg-white px-6 py-10 md:px-10 md:py-14 lg:px-16">
        <SkeletonRegion label="Loading policy…" className="flex flex-col gap-4 py-10">
          {[90, 70, 95, 60, 80, 50, 85].map((w, i) => (
            <div key={i} className="sk h-4 rounded" style={{ width: `${w}%` }} />
          ))}
        </SkeletonRegion>
      </section>
    </>
  );
}
