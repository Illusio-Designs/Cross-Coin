import Link from 'next/link';
import ProductCard from '../products/ProductCard';

/* Bestseller product grid. Prop-driven: pass `products` from the API.
   `title` + `cta` configurable so it doubles as "New Arrivals" etc.
   Skeleton while empty. */

export default function BestsellerRow({
  products = [],
  eyebrow = 'Most loved',
  title = 'Bestsellers',
  accent = 'this season.',
  ctaHref = '/products',
}) {
  const skeleton = !products.length;

  return (
    <section className="section-y bg-paper-warm border-y border-line">
      <div className="wrap">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="eyebrow mb-3">{eyebrow}</p>
            <h2 className="h-display text-3xl md:text-5xl">
              {title} <span className="h-italic">{accent}</span>
            </h2>
          </div>
          <Link href={ctaHref} className="hidden sm:inline-flex btn-outline">See all</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-9">
          {skeleton
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[4/5] rounded-lg bg-gray-200 animate-pulse" />
                  <div className="mt-3.5 h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
                </div>
              ))
            : products.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        <div className="mt-10 sm:hidden">
          <Link href={ctaHref} className="btn-outline w-full">See all</Link>
        </div>
      </div>
    </section>
  );
}
