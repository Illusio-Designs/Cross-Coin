import Link from 'next/link';
import Icon from '@/components/Icon';
import AddToCart from '@/components/AddToCart';
import ShimmerImg from '@/components/ui/ShimmerImg';
import WishlistButton from '@/components/product/WishlistButton';

// Soxbae product card — premium editorial: a calm framed image with the details
// set quietly BELOW on the ivory (category · name · price). A discreet add
// button fades in over the image on hover.
export default function ProductCard({ product }) {
  const { id, slug, name, category, price, oldPrice, sizes, badge, badgeKey, image } = product;
  const href = `/products/${slug}`;
  const off = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

  return (
    <article className="sxp">
      <div className="sxp-media">
        {image
          ? <ShimmerImg src={image} alt={name} loading="lazy" />
          : <span className="sxp-ph" aria-hidden><Icon name="Footprints" size={40} /></span>}

        <Link href={href} className="sxp-link" aria-label={name} />

        <div className="sxp-tags">
          {badge && <span className={`sxp-tag b-${badgeKey || 'default'}`}>{badge}</span>}
          {oldPrice && <span className="sxp-tag sale">-{off}%</span>}
        </div>
        <WishlistButton productId={id} className="sxp-fav" />

        <div className="sxp-add">
          <AddToCart product={product} display="icon" size={Array.isArray(sizes) ? (sizes[1] || sizes[0]) : 'M'} />
        </div>
      </div>

      <div className="sxp-info">
        {category && <span className="sxp-cat">{category}</span>}
        <h3 className="sxp-name"><Link href={href}>{name}</Link></h3>
        <div className="sxp-price">
          ₹{price.toFixed(0)}{oldPrice && <span className="old">₹{oldPrice.toFixed(0)}</span>}
        </div>
      </div>
    </article>
  );
}
