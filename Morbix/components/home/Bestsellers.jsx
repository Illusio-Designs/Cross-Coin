import Icon from '@/components/Icon';
import ProductCard from './ProductCard';

export default function Bestsellers({ products = [] }) {
  return (
    <section className="section container" id="bestsellers">
      <div className="section-head">
        <h2>Bestsellers</h2>
        <a href="#" className="link-more">View all <Icon name="ArrowRight" size={14} /></a>
      </div>
      <div className="product-grid">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
