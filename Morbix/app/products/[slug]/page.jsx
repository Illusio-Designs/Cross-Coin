import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import ProductShowcase from '@/components/product/ProductShowcase';
import ProductCard from '@/components/home/ProductCard';
import { getProductBySlug, getAllProducts, getProductReviews } from '@/lib/api';

// Render on-demand with fresh data (never a stale/empty server cache), and so
// a surprising single product can never fail a static build.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  return p ? { title: p.name, description: p.description } : { title: 'Product' };
}

// Static star-rating distribution for the reviews summary (visual only).
const DIST = [
  { s: 5, pct: 72 }, { s: 4, pct: 19 }, { s: 3, pct: 6 }, { s: 2, pct: 2 }, { s: 1, pct: 1 },
];

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [all, reviews] = await Promise.all([getAllProducts(), getProductReviews(product.id)]);
  const related = all.filter((p) => p.categorySlug === product.categorySlug && p.slug !== product.slug).slice(0, 5);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 20 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/products">Shop</Link>{' '}
        <span>/</span> <Link href={`/collections/${product.categorySlug}`}>{product.category}</Link>{' '}
        <span>/</span> <b>{product.name}</b>
      </nav>

      {/* ── Gallery + buy panel + About/Specs (shared variation selection) ── */}
      <ProductShowcase product={product} />

      {/* ── Reviews ── */}
      <section className="pdp-reviews section" id="reviews">
        <div className="section-head"><h2>Customer reviews</h2></div>
        <div className="reviews-layout">
          <div className="reviews-summary">
            <div className="rs-score">{product.rating.toFixed(1)}</div>
            <div className="rs-stars">
              {[0, 1, 2, 3, 4].map((i) => (
                <Icon key={i} name="Star" size={16} color={i < Math.round(product.rating) ? 'var(--star)' : '#d7dde2'} />
              ))}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>Based on {product.reviews} reviews</div>
            <div className="rs-bars">
              {DIST.map((d) => (
                <div className="rs-bar" key={d.s}>
                  <span>{d.s}★</span>
                  <div className="rs-track"><div className="rs-fill" style={{ width: `${d.pct}%` }} /></div>
                  <span className="muted">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="reviews-list">
            {reviews.map((r, i) => (
              <div className="review" key={i}>
                <div className="review-head">
                  <div className="review-av">{r.author.charAt(0)}</div>
                  <div>
                    <b>{r.author}</b>
                    <div className="review-stars">
                      {[0, 1, 2, 3, 4].map((n) => (
                        <Icon key={n} name="Star" size={12} color={n < r.rating ? 'var(--star)' : '#d7dde2'} />
                      ))}
                      <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{r.date}</span>
                    </div>
                  </div>
                </div>
                <b className="review-title">{r.title}</b>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="section-head"><h2>You might also like</h2></div>
          <div className="product-grid">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
