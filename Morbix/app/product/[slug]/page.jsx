import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import ProductBuy from '@/components/product/ProductBuy';
import ProductCard from '@/components/home/ProductCard';
import { getProductBySlug, getAllProducts } from '@/lib/api';

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

const HIGHLIGHTS = [
  { icon: 'Layers', text: 'Cushioned heel & toe' },
  { icon: 'Wind', text: 'Breathable knit' },
  { icon: 'Heart', text: 'Arch-support band' },
  { icon: 'Leaf', text: 'Eco-friendly fibres' },
];

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const all = await getAllProducts();
  const related = all.filter((p) => p.categorySlug === product.categorySlug && p.slug !== product.slug).slice(0, 5);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 20 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/catalog">Catalog</Link> <span>/</span> <b>{product.name}</b>
      </nav>

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
            <span className="rating"><Icon name="Star" size={14} fill="currentColor" /> {product.rating}</span>
            <span className="muted">{product.reviews} reviews</span>
          </div>
          <div className="pdp-price">
            ${product.price.toFixed(2)}
            {product.oldPrice && <span className="old">${product.oldPrice.toFixed(2)}</span>}
          </div>
          <p className="pdp-desc">{product.description}</p>

          <ProductBuy product={product} />

          <ul className="pdp-highlights">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text}><span className="ic"><Icon name={h.icon} size={16} /></span>{h.text}</li>
            ))}
          </ul>

          <div className="pdp-trust">
            <div><Icon name="Truck" size={16} /> Free shipping over $50</div>
            <div><Icon name="RefreshCw" size={16} /> 14-day returns</div>
          </div>
        </div>
      </div>

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
