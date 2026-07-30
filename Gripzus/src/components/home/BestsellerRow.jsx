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
    <section className="section-y bg-paper-warm border-y-2 border-ink">
      <div className="wrap">
        <div className="flex flex-col items-start gap-5 mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <span className="kicker mb-4">{eyebrow}</span>
            <h2 className="h-mark text-ink text-4xl sm:text-5xl md:text-7xl">
              {title} {accent}
            </h2>
          </div>
          <Link href={ctaHref} className="btn-outline shrink-0">See all</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-9">
          {skeleton
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[4/5] bg-paper-deep animate-pulse" />
                  <div className="mt-3.5 h-3 w-1/3 bg-paper-deep animate-pulse" />
                  <div className="mt-2 h-4 w-2/3 bg-paper-deep animate-pulse" />
                </div>
              ))
            : products.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}
