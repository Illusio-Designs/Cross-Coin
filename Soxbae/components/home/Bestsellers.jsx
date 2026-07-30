import Link from 'next/link';
import Icon from '@/components/Icon';
import ProductCard from './ProductCard';

export default function Bestsellers({ products = [] }) {
  return (
    <section className="section container" id="bestsellers">
      <div className="section-head">
        <h2>Bestsellers</h2>
        <Link href="/products" className="link-more">View all <Icon name="ArrowRight" size={14} /></Link>
      </div>
      {products.length > 0 ? (
        <div className="product-grid">
          {/* Two rows — "View all" leads to the full shop grid. */}
          {products.slice(0, 8).map((p) => <ProductCard key={p.uid ?? p.id} product={p} />)}
        </div>
      ) : (
        <div className="empty">No products yet — check back soon.</div>
      )}
    </section>
  );
}
