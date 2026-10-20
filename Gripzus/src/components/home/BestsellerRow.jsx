import ProductCard from '../products/ProductCard';
import SectionHead from '../common/SectionHead';
import { SkBusy, ProductCardSkeletons } from '../common/Skeleton';

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
  index = 3,
}) {
  const skeleton = !products.length;

  return (
    <section className="section-y">
      <div className="wrap">
        <SectionHead index={index} eyebrow={eyebrow} title={title} linkHref={ctaHref} linkLabel="See all" />

        {/* Single row — item count follows the column count at each width
            (2 on mobile, 4 on md, 5 on xl); extras are hidden, not wrapped. */}
        {skeleton ? (
          <SkBusy label="Loading bestsellers…" className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-x-4 md:gap-x-5">
            <ProductCardSkeletons n={5} vis={rowVis} />
          </SkBusy>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-x-4 md:gap-x-5">
            {products.slice(0, 5).map((p, i) => (
              <div key={p.uid ?? p.id} className={rowVis(i)}><ProductCard product={p} /></div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
