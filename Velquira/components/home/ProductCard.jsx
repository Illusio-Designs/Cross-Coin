import Link from 'next/link';
import Icon from '@/components/Icon';
import AddToCart from '@/components/AddToCart';
import ShimmerImg from '@/components/ui/ShimmerImg';
import WishlistButton from '@/components/product/WishlistButton';

// Velquira product card — an editorial "gallery plate" rather than a boxed
// storefront tile: a tall portrait image inside a double gold hairline frame,
// then a centred nameplate (category kicker → serif name → gold rule → price).
// Deliberately structured differently from the other brands' square cards.
export default function ProductCard({ product }) {
  const { id, slug, name, category, price, oldPrice, rating, sizes, colors, badge, badgeKey, image } = product;
  const href = `/products/${slug}`;
  const off = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

  return (
    <article className="vqp">
      <div className="vqp-media">
        <span className="vqp-frame-line" aria-hidden />

        <div className="vqp-tags">
          {badge && <span className={`vqp-tag b-${badgeKey || 'default'}`}>{badge}</span>}
          {oldPrice && <span className="vqp-tag sale">-{off}%</span>}
        </div>
        <WishlistButton productId={id} className="vqp-fav" />

        <Link href={href} className="vqp-imglink" aria-label={name}>
          {image
            ? <ShimmerImg src={image} alt={name} loading="lazy" />
            : <span className="vqp-ph" aria-hidden><Icon name="Sparkles" size={40} /></span>}
        </Link>

        {/* Desktop: an elegant reveal on hover. */}
        <div className="vqp-reveal">
          <AddToCart product={product} display="bar" size={Array.isArray(sizes) ? (sizes[1] || sizes[0]) : 'M'} />
        </div>
        {/* Touch: a persistent bag disc, bottom-right of the plate. */}
        <div className="vqp-mob">
          <AddToCart product={product} display="icon" size={Array.isArray(sizes) ? (sizes[1] || sizes[0]) : 'M'} />
        </div>
      </div>

      <div className="vqp-plate">
        {category && <span className="vqp-cat">{category}</span>}
        <Link href={href}><h3 className="vqp-name">{name}</h3></Link>
        <span className="vqp-rule" aria-hidden />

        <div className="vqp-meta">
          <span className="vqp-price">
            ₹{price.toFixed(0)}{oldPrice && <span className="old">₹{oldPrice.toFixed(0)}</span>}
          </span>
          {rating > 0 && (
            <span className="vqp-rate"><Icon name="Star" size={11} color="var(--gold)" /> {Number(rating).toFixed(1)}</span>
          )}
        </div>

        {colors?.length > 0 && (
          <div className="vqp-colors">
            {colors.slice(0, 5).map((c, i) => <span key={i} style={{ background: c }} />)}
            {colors.length > 5 && <em>+{colors.length - 5}</em>}
          </div>
        )}
      </div>
    </article>
  );
}
