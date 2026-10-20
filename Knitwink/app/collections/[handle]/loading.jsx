import Link from 'next/link';
import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton';

// Collection page: the dark hero (crumbs stay real), then the product grid in
// the page's own columns.
export default function CollectionLoading() {
  return (
    <>
      <section className="relative overflow-hidden bg-brand-black min-h-[200px] sm:min-h-[260px] md:min-h-[320px]">
        <div className="relative flex h-full min-h-[200px] sm:min-h-[260px] md:min-h-[320px] flex-col items-start justify-end px-4 pt-32 pb-8 sm:px-6 sm:pt-36 sm:pb-10 md:px-10 md:pt-40">
          <nav aria-label="Breadcrumb" className="mb-2 text-xs text-white/60">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/collections" className="hover:text-white">Collections</Link>
          </nav>
          <Skeleton className="sk--dark h-9 w-56 max-w-[80%]" />
          <Skeleton className="sk--dark mt-3 h-3.5 w-80 max-w-[90%]" />
          <Skeleton className="sk--dark mt-3 h-3 w-16" />
        </div>
      </section>
      <section className="mx-auto max-w-site px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <ProductGridSkeleton count={8} className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4" />
      </section>
    </>
  );
}
