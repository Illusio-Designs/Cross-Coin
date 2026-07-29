import Link from 'next/link';
import Icon from '@/components/Icon';
import AddToCart from '@/components/AddToCart';
import ShimmerImg from '@/components/ui/ShimmerImg';
import WishlistButton from '@/components/product/WishlistButton';

// Soxbae product card — bold overlay: full-bleed image with the category, name
// and a black price pill laid OVER the photo, plus an orange "+" add button.
// Energetic, playful — the Soxbae look.
export default function ProductCard({ product }) {
  const { id, slug, name, category, price, oldPrice, sizes, badge, badgeKey, image } = product;
  const href = `/products/${slug}`;
  const off = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

  return (
    <article className="soxp">
      <div className="soxp-media">
        {image
          ? <ShimmerImg src={image} alt={name} loading="lazy" />
          : <span className="soxp-ph" aria-hidden><Icon name="Footprints" size={44} /></span>}

        <Link href={href} className="soxp-link" aria-label={name} />

        <div className="soxp-tags">
          {badge && <span className={`soxp-tag b-${badgeKey || 'default'}`}>{badge}</span>}
          {oldPrice && <span className="soxp-tag sale">-{off}%</span>}
        </div>
        <WishlistButton productId={id} className="soxp-fav" />

        <div className="soxp-cap">
          {category && <span className="soxp-cat">{category}</span>}
          <h3 className="soxp-name">{name}</h3>
          <div className="soxp-foot">
            <span className="soxp-price">
              ₹{price.toFixed(0)}{oldPrice && <span className="old">₹{oldPrice.toFixed(0)}</span>}
            </span>
            <div className="soxp-add">
              <AddToCart product={product} display="icon" size={Array.isArray(sizes) ? (sizes[1] || sizes[0]) : 'M'} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
