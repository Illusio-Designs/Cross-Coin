import Link from 'next/link';
import ProductCard from '../products/ProductCard';

/* Bestseller product grid — editorial gallery. Prop-driven: pass `products`
   from the API. `title` + `cta` configurable so it doubles as "New Arrivals"
   etc. Tiny section label + underlined link. Skeleton while empty. Shows up
   to 8 pairs on a responsive 2 → 4 column grid, using the shared ProductCard
   so every pair looks identical to the rest of the site. */

// Keep the grid to a single row: items 0–1 always show, 2–3 from md, 4 from xl.
const rowVis = (i) => (i < 2 ? '' : i < 4 ? 'hidden md:block' : 'hidden xl:block');

export default function BestsellerRow({
  products = [],
  eyebrow = 'Most loved',
  title = 'Bestsellers',
  accent = 'this season.',
  ctaHref = '/products',
}) {
  const skeleton = !products.length;

  return (
    <section className="section-y">
      <div className="wrap">
        {/* quiet header */}
        <div className="flex items-end justify-between mb-10 md:mb-14">
          <div>
            <span className="kicker text-ink-muted">{eyebrow}</span>
            <h2 className="h-display text-3xl md:text-[2.6rem] mt-3">{title}</h2>
          </div>
          <Link href={ctaHref} className="link-line">See all <span aria-hidden>→</span></Link>
        </div>

        {/* Single row — item count follows the column count at each width
            (2 on mobile, 4 on md, 5 on xl); extras are hidden, not wrapped. */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-x-4 md:gap-x-5">
          {skeleton
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={rowVis(i)}>
                  <div className="aspect-[4/5] rounded-xl bg-paper-deep animate-pulse" />
                  <div className="mt-3.5 h-2.5 w-1/3 bg-paper-deep animate-pulse rounded" />
                  <div className="mt-2 h-3 w-2/3 bg-paper-deep animate-pulse rounded" />
                </div>
              ))
            : products.slice(0, 5).map((p, i) => (
                <div key={p.uid ?? p.id} className={rowVis(i)}><ProductCard product={p} /></div>
              ))}
        </div>
      </div>
    </section>
  );
}
