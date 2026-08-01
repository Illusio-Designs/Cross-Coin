import Link from 'next/link';
import ProductCard from '../products/ProductCard';

/* Bestseller product grid — editorial gallery. Prop-driven: pass `products`
   from the API. `title` + `cta` configurable so it doubles as "New Arrivals"
   etc. Tiny section label + underlined link. Skeleton while empty. Shows up
   to 8 pairs on a responsive 2 → 4 column grid, using the shared ProductCard
   so every pair looks identical to the rest of the site. */

export default function BestsellerRow({
  products = [],
  eyebrow = 'Most loved',
  title = 'Bestsellers',
  accent = 'this season.',
  ctaHref = '/products',
  limit = 8,
}) {
  const skeleton = !products.length;

  return (
    <section className="section-y">
      <div className="wrap">
        {/* quiet header */}
        <div className="flex items-end justify-between mb-10 md:mb-14">
          <div>
            <p className="eyebrow text-ink-muted mb-3">{eyebrow}</p>
            <h2 className="h-display text-2xl md:text-3xl">{title}</h2>
          </div>
          <Link href={ctaHref} className="link-line">See all</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
          {skeleton
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[4/5] rounded-xl bg-paper-deep animate-pulse" />
                  <div className="mt-3.5 h-2.5 w-1/3 bg-paper-deep animate-pulse rounded" />
                  <div className="mt-2 h-3 w-2/3 bg-paper-deep animate-pulse rounded" />
                </div>
              ))
            : products.slice(0, limit).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}
