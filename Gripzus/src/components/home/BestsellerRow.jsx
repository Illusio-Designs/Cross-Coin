import Link from 'next/link';
import ProductCard from '../products/ProductCard';

/* Bestseller product grid — techwear datasheet. Prop-driven: pass
   `products` from the API. `title` + `cta` configurable so it doubles as
   "New Arrivals" etc. Skeleton while empty. */

export default function BestsellerRow({
  products = [],
  eyebrow = 'Most loved',
  title = 'Bestsellers',
  accent = 'this season.',
  ctaHref = '/products',
}) {
  const skeleton = !products.length;
  const count = skeleton ? 4 : Math.min(products.length, 4);

  return (
    <section className="section-y bg-paper-warm border-y border-line">
      <div className="wrap">
        {/* datasheet header */}
        <div className="flex items-center justify-between border-t border-ink pt-3 mb-8">
          <span className="spec text-ink">SELECTION — TOP RANKED</span>
          <span className="spec text-ink-muted">{String(count).padStart(2, '0')} UNITS</span>
        </div>

        <div className="flex flex-col items-start gap-4 mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <p className="kicker mb-4">{eyebrow}</p>
            <h2 className="h-mark text-3xl sm:text-4xl md:text-5xl">
              {title} {accent}
            </h2>
          </div>
          <Link href={ctaHref} className="btn-outline shrink-0">See all</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
          {skeleton
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[4/5] rounded-[16px] bg-paper-deep animate-pulse" />
                  <div className="mt-5 h-3 w-1/3 rounded bg-paper-deep animate-pulse" />
                  <div className="mt-2.5 h-4 w-2/3 rounded bg-paper-deep animate-pulse" />
                </div>
              ))
            : products.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}
