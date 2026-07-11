import Link from 'next/link';
import Icon from '@/components/Icon';
import AddToCart from '@/components/AddToCart';

export default function ProductCard({ product }) {
  const { slug, name, category, price, oldPrice, rating, sizes, badge, image } = product;
  const href = `/product/${slug}`;
  return (
    <article className="pcard">
      <div className="pcard-imgwrap">
        {badge === 'new' && <span className="pcard-badge new">New</span>}
        {badge === 'sale' && oldPrice && (
          <span className="pcard-badge sale">-{Math.round((1 - price / oldPrice) * 100)}%</span>
        )}
        <AddToCart product={product} display="icon" />
        <Link href={href} className="pcard-link" aria-label={name}>
          {image ? (
            <img src={image} alt={name} loading="lazy" />
          ) : (
            <span style={{ color: '#c3ccd2' }} aria-hidden><Icon name="Footprints" size={40} /></span>
          )}
        </Link>
      </div>
      <Link href={href}><h3>{name}</h3></Link>
      <div className="cat">{category}</div>
      <div className="pcard-foot">
        <div className="price">${price.toFixed(2)}{oldPrice && <span className="old">${oldPrice.toFixed(2)}</span>}</div>
        <div className="rating"><Icon name="Star" size={13} fill="currentColor" /> {rating}</div>
      </div>
      <div className="sizes" style={{ marginTop: 6 }}>Sizes {Array.isArray(sizes) ? sizes.join(' · ') : sizes}</div>
    </article>
  );
}
