import Link from 'next/link';
import Icon from '@/components/Icon';
import AddToCart from '@/components/AddToCart';
import ShimmerImg from '@/components/ui/ShimmerImg';
import WishlistButton from '@/components/product/WishlistButton';

export default function ProductCard({ product }) {
  const { id, slug, name, category, price, oldPrice, rating, reviews, sizes, colors, badge, badgeKey, image } = product;
  const href = `/products/${slug}`;
  const off = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

  return (
    <article className="pcard">
      <div className="pcard-media">
        <div className="pcard-badges">
          {badge && <span className={`pcard-badge b-${badgeKey || 'default'}`}>{badge}</span>}
          {oldPrice && <span className="pcard-badge sale">-{off}%</span>}
        </div>
        <WishlistButton productId={id} />

        <Link href={href} className="pcard-imglink" aria-label={name}>
          {image
            ? <ShimmerImg src={image} alt={name} loading="lazy" />
            : <span className="pcard-ph" aria-hidden><Icon name="Footprints" size={48} /></span>}
        </Link>

        <div className="pcard-quickadd">
          <AddToCart product={product} display="bar" size={Array.isArray(sizes) ? (sizes[1] || sizes[0]) : 'M'} />
        </div>
      </div>

      <div className="pcard-body">
        {/* Lead with the product name (not the long collection name) so the card
            reads cleanly — same as the other brands. */}
        <Link href={href}><h3 className="pcard-name">{name}</h3></Link>

        <div className="pcard-foot">
          <div className="pcard-price">
            ₹{price.toFixed(0)}{oldPrice && <span className="old">₹{oldPrice.toFixed(0)}</span>}
          </div>
          {rating > 0 && (
            <span className="pcard-rate"><Icon name="Star" size={12} color="var(--star)" /> {Number(rating).toFixed(1)}</span>
          )}
        </div>

        {colors?.length > 0 && (
          <div className="pcard-colors">
            {colors.slice(0, 5).map((c, i) => <span key={i} style={{ background: c }} />)}
            {colors.length > 5 && <em>+{colors.length - 5}</em>}
          </div>
        )}
      </div>
    </article>
  );
}
