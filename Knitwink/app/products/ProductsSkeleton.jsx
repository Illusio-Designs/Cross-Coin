import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton'

// /products while the client grid boots: the dark hero with its real title,
// the controls bar, and the product grid in the same columns.
export function ProductsSkeleton() {
  return (
    <>
      <section className="relative overflow-hidden bg-brand-black min-h-[240px] sm:min-h-[300px] md:min-h-[380px]">
        <div className="relative flex h-full min-h-[240px] sm:min-h-[300px] md:min-h-[380px] flex-col items-start justify-end px-4 pt-32 pb-8 sm:px-6 sm:pt-36 sm:pb-10 md:px-10 md:pt-40">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">All Products</h1>
          <p className="mt-2 text-sm text-white/50">Premium socks crafted for comfort and style.</p>
        </div>
      </section>
      <div className="mx-3 mt-2 rounded-2xl border border-gray-100 bg-white/95 px-4 shadow-sm md:px-6" aria-hidden="true">
        <div className="flex h-14 items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <div className="hidden gap-1.5 sm:flex">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-16 rounded-full" />)}
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
      <div className="bg-off-white px-4 py-8 md:px-6">
        <ProductGridSkeleton count={8} className="mx-auto grid max-w-site grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" />
      </div>
    </>
  )
}
