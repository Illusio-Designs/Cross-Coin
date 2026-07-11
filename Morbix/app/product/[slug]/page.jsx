import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import ProductBuy from '@/components/product/ProductBuy';
import ProductCard from '@/components/home/ProductCard';
import { getProductBySlug, getAllProducts, getProductReviews } from '@/lib/api';

export const revalidate = 300;

export async function generateStaticParams() {
  const all = await getAllProducts();
  return all.map((p) => ({ slug: p.slug }));
}

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

  const [all, reviews] = await Promise.all([getAllProducts(), getProductReviews(slug)]);
  const related = all.filter((p) => p.categorySlug === product.categorySlug && p.slug !== product.slug).slice(0, 5);

  const specs = [
    ['Material', product.material],
    ['Care', product.care],
    ['Fit', product.fit],
    ['Cushioning', product.cushioning],
    ['Category', product.category],
    ['Available sizes', Array.isArray(product.sizes) ? product.sizes.join(', ') : product.sizes],
    ['Origin', product.origin],
    ['SKU', product.sku],
  ].filter(([, v]) => v);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 20 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/catalog">Catalog</Link>{' '}
        <span>/</span> <Link href={`/catalog?cat=${product.categorySlug}`}>{product.category}</Link>{' '}
        <span>/</span> <b>{product.name}</b>
      </nav>

      {/* ── Buy panel ── */}
      <div className="pdp">
        <div className="pdp-gallery">
          <div className="pdp-main">
            {product.image
              ? <img src={product.image} alt={product.name} />
              : <span aria-hidden style={{ color: '#c3ccd2' }}><Icon name="Footprints" size={72} /></span>}
            {product.badge === 'new' && <span className="pcard-badge new" style={{ top: 16, left: 16 }}>New</span>}
          </div>
          <div className="pdp-thumbs">
            {[0, 1, 2, 3].map((i) => (
              <div className="pdp-thumb" key={i}><Icon name="Footprints" size={22} color="#c3ccd2" /></div>
            ))}
          </div>
        </div>

        <div className="pdp-info">
          <span className="eyebrow">{product.category}</span>
          <h1>{product.name}</h1>
          <div className="pdp-meta">
            <span className="rating"><Icon name="Star" size={14} /> {product.rating}</span>
            <a href="#reviews" className="muted">{product.reviews} reviews</a>
            <span className="in-stock"><Icon name="ShieldCheck" size={13} /> In stock</span>
          </div>
          <div className="pdp-price">
            ${product.price.toFixed(2)}
            {product.oldPrice && <span className="old">${product.oldPrice.toFixed(2)}</span>}
          </div>
          <p className="pdp-desc">{product.description}</p>

          <ProductBuy product={product} />

          <div className="pdp-trust">
            <div><Icon name="Truck" size={16} /> Free shipping over $50</div>
            <div><Icon name="RefreshCw" size={16} /> 14-day returns</div>
            <div><Icon name="ShieldCheck" size={16} /> Authentic</div>
          </div>
        </div>
      </div>

      {/* ── About + Specifications ── */}
      <section className="pdp-details">
        <div className="pdp-about">
          <span className="eyebrow">Details</span>
          <h2>About this product</h2>
          <p>{product.description}</p>
          <p>Every pair is knit for the long haul — reinforced where it counts, breathable where it matters, and finished with a seamless toe so nothing rubs. Designed for {product.category.toLowerCase()} and built to feel just as good on the tenth wear as the first.</p>

          {product.features?.length > 0 && (
            <ul className="pdp-features">
              {product.features.map((f) => (
                <li key={f.text}><span className="ic"><Icon name={f.icon} size={18} /></span>{f.text}</li>
              ))}
            </ul>
          )}
        </div>

        <aside className="pdp-specs">
          <h3>Specifications</h3>
          <dl>
            {specs.map(([k, v]) => (
              <div className="spec-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </aside>
      </section>

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
