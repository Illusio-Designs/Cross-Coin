import Link from 'next/link';
import Icon from '@/components/Icon';
import AddToCart from '@/components/AddToCart';
import ShimmerImg from '@/components/ui/ShimmerImg';
import WishlistButton from '@/components/product/WishlistButton';

// Velquira product card — "lookbook overlay": one full-bleed portrait image
// with the category kicker, name and price laid directly OVER the photo on a
// soft gradient. No card box, no grid-tile look. A tap anywhere on the image
// opens the product; wishlist + add-to-bag float above it.
export default function ProductCard({ product }) {
  const { id, slug, name, category, price, oldPrice, sizes, badge, badgeKey, image } = product;
  const href = `/products/${slug}`;
  const off = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

  return (
    <article className="vqp">
      <div className="vqp-media">
        {image
          ? <ShimmerImg src={image} alt={name} loading="lazy" />
          : <span className="vqp-ph" aria-hidden><Icon name="Sparkles" size={40} /></span>}

        {/* full-image navigation layer (buttons below sit above this) */}
        <Link href={href} className="vqp-link" aria-label={name} />

        <div className="vqp-tags">
          {badge && <span className={`vqp-badge b-${badgeKey || 'default'}`}>{badge}</span>}
          {oldPrice && <span className="vqp-badge sale">-{off}%</span>}
        </div>
        <WishlistButton productId={id} className="vqp-fav" />

        {/* Touch devices: a small bag icon bottom-right instead of the full bar. */}
        <div className="vqp-mob">
          <AddToCart product={product} display="icon" size={Array.isArray(sizes) ? (sizes[1] || sizes[0]) : 'M'} />
        </div>

        <div className="vqp-cap">
          <div className="vqp-tbg">
            <h3 className="vqp-name">{name}</h3>
            <div className="vqp-price">
              ₹{price.toFixed(0)}{oldPrice && <span className="old">₹{oldPrice.toFixed(0)}</span>}
            </div>
          </div>
          <div className="vqp-add">
            <AddToCart product={product} display="bar" size={Array.isArray(sizes) ? (sizes[1] || sizes[0]) : 'M'} />
          </div>
        </div>
      </div>
    </article>
  );
}
