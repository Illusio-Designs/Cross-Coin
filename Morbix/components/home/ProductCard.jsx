import Link from 'next/link';
import Icon from '@/components/Icon';
import AddToCart from '@/components/AddToCart';

export default function ProductCard({ product }) {
  const { slug, name, category, price, oldPrice, rating, reviews, sizes, colors, badge, image } = product;
  const href = `/product/${slug}`;
  const off = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

  return (
    <article className="pcard">
      <div className="pcard-media">
        {badge === 'new' && <span className="pcard-badge new">New</span>}
        {oldPrice && <span className="pcard-badge sale">-{off}%</span>}
        <button className="pcard-fav" aria-label="Add to wishlist"><Icon name="Heart" size={15} /></button>

        <Link href={href} className="pcard-imglink" aria-label={name}>
          {image
            ? <img src={image} alt={name} loading="lazy" />
            : <span className="pcard-ph" aria-hidden><Icon name="Footprints" size={48} /></span>}
        </Link>

        <div className="pcard-quickadd">
          <AddToCart product={product} display="bar" size={Array.isArray(sizes) ? (sizes[1] || sizes[0]) : 'M'} />
        </div>
      </div>

      <div className="pcard-body">
        <span className="pcard-cat">{category}</span>
        <Link href={href}><h3 className="pcard-name">{name}</h3></Link>

        <div className="pcard-rating">
          {[0, 1, 2, 3, 4].map((i) => (
            <Icon key={i} name="Star" size={12} color={i < Math.round(rating) ? 'var(--star)' : '#dce2e6'} />
          ))}
          <span className="pcard-rcount">{rating}{reviews ? ` (${reviews})` : ''}</span>
        </div>

        {colors?.length > 0 && (
          <div className="pcard-colors">
            {colors.slice(0, 4).map((c, i) => <span key={i} style={{ background: c }} />)}
            {colors.length > 4 && <em>+{colors.length - 4}</em>}
          </div>
        )}

        <div className="pcard-foot">
          <div className="pcard-price">
            ${price.toFixed(2)}{oldPrice && <span className="old">${oldPrice.toFixed(2)}</span>}
          </div>
          <span className="pcard-sizes">{Array.isArray(sizes) ? sizes.join(' · ') : sizes}</span>
        </div>
      </div>
    </article>
  );
}
