import { cn } from '@/lib/utils';

/**
 * Knitwink skeleton kit — soft grey shimmering shapes drawn WHERE the content
 * will appear, in the same shape, so nothing jumps when the data lands.
 * One shimmer for the whole storefront: `.sk` in styles/globals.css.
 *
 *   <Skeleton className="h-4 w-3/4" />            one bar (Tailwind sizes)
 *   <SkeletonRegion label="Loading orders…">…     role="status" wrapper
 *   <ProductCardSkeleton />                       the real bordered product card
 *   <ProductGridSkeleton className="grid …" />    grid of cards, same columns
 *   <BlogCardSkeleton />                          16:9 journal card
 *
 * Keep the real page header, filters and titles on screen; replace only the
 * part that is loading. When data is already shown and is being refreshed,
 * keep it (dimmed with `.sk-refreshing`) instead of flashing a skeleton.
 */
export function Skeleton({ className, style }) {
  return <div className={cn('sk rounded-md', className)} style={style} aria-hidden="true" />;
}

/** Accessible loading region: announced once, shapes hidden from AT.
 *  label={null} → already inside another region, render the shapes only. */
export function SkeletonRegion({ label = 'Loading…', as: Tag = 'div', className, style, children }) {
  if (label === null) return <Tag className={className} style={style} aria-hidden="true">{children}</Tag>;
  return (
    <Tag className={className} style={style} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </Tag>
  );
}

/** Same box as components/collection/ProductCard: bordered card, square
 *  image, name, price, colour dots and the "Add to Bag" button. */
export function ProductCardSkeleton({ className }) {
  return (
    <div className={cn('flex flex-col rounded-2xl border border-gray-200 bg-white p-3', className)} aria-hidden="true">
      <div className="relative aspect-square overflow-hidden rounded-xl">
        <div className="sk absolute inset-0" />
      </div>
      <div className="mt-3 px-1">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/3" />
        <div className="mt-2 flex gap-1.5">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-4 rounded-full" />)}
        </div>
        <Skeleton className="mt-3 h-[34px] w-full rounded-xl" />
      </div>
    </div>
  );
}

/** A grid of product-card skeletons. Pass the real grid's classes. */
export function ProductGridSkeleton({
  count = 8,
  className = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  label = 'Loading products…',
}) {
  return (
    <SkeletonRegion label={label} className={className}>
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </SkeletonRegion>
  );
}

/** Same box as components/home/BlogCard: 16:9 cover, date, title, excerpt. */
export function BlogCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm" aria-hidden="true">
      <div className="relative aspect-[16/9]"><div className="sk absolute inset-0 rounded-none" /></div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-1 h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

/** Lines of body copy (last line shorter). */
export function SkeletonText({ lines = 4, className }) {
  const widths = ['w-full', 'w-11/12', 'w-full', 'w-4/5', 'w-full', 'w-5/6'];
  return (
    <div className={cn('flex flex-col gap-2.5', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 && lines > 1 ? 'w-2/3' : widths[i % widths.length])} />
      ))}
    </div>
  );
}

/** The black page hero used by search / wishlist / contact / journal etc.
 *  Pass the real title; only the sub-line shimmers. */
export function DarkHeroSkeleton({ title, children }) {
  return (
    <section className="relative overflow-hidden bg-brand-black px-4 pt-32 pb-12 text-center sm:px-6 sm:pt-36 sm:pb-16 md:px-10 md:pt-40 md:pb-20">
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
      <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
      <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />
      <div className="relative">
        {title
          ? <h1 className="mt-2 text-3xl font-bold text-white lg:text-4xl">{title}</h1>
          : <Skeleton className="sk--dark mx-auto mt-2 h-9 w-64 max-w-[80%]" />}
        <Skeleton className="sk--dark mx-auto mt-4 h-3.5 w-56 max-w-[70%]" />
        {children}
      </div>
    </section>
  );
}

export default Skeleton;
