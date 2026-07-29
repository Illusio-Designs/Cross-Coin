import Link from 'next/link';
import Icon from '@/components/Icon';
import AddToCart from '@/components/AddToCart';
import ShimmerImg from '@/components/ui/ShimmerImg';
import WishlistButton from '@/components/product/WishlistButton';

// Soxbae product card — "plate": a full framed image with a floating info plate
// that overlaps its bottom edge (category · name + price on one row · colour
// swatches + a small add button). Distinctive and premium.
export default function ProductCard({ product }) {
  const { id, slug, name, category, price, oldPrice, sizes, badge, badgeKey, image, group, colors, colorNames, colorParam } = product;
  const href = colorParam ? `/products/${slug}?color=${encodeURIComponent(colorParam)}` : `/products/${slug}`;
  const off = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
  // Colour dots come from EITHER a merged group (separate products, each linking
  // to its own page) OR a single product's own colour variations (dots link to
  // this product's page). Show whenever there's more than one colour.
  const swatches = Array.isArray(group) && group.length > 1
    ? group
    : (Array.isArray(colors) && colors.length > 1
        ? colors.map((hex, i) => ({ name: (colorNames && colorNames[i]) || '', hex, slug: null }))
        : null);
  const isGroup = Array.isArray(group) && group.length > 1;

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
      </div>

      <div className="sxp-info">
        {category && <span className="sxp-cat">{category}</span>}
        <div className="sxp-plate-row">
          <h3 className="sxp-name"><Link href={href}>{name}</Link></h3>
          <span className="sxp-price">
            {isGroup ? 'From ' : ''}₹{price.toFixed(0)}{oldPrice && <span className="old">₹{oldPrice.toFixed(0)}</span>}
          </span>
        </div>
        <div className="sxp-plate-foot">
          {swatches ? (
            <div className="sxp-swatches" aria-label={`${swatches.length} colours`}>
              {swatches.slice(0, 6).map((s, i) => (
                <Link key={s.slug || i} href={s.slug ? `/products/${s.slug}` : href} className="sxp-sw"
                  style={{ background: s.hex }} title={s.name || 'colour'} aria-label={s.name || 'colour'} />
              ))}
              {swatches.length > 6 && <span className="sxp-sw-more">+{swatches.length - 6}</span>}
            </div>
          ) : <span />}
          <div className="sxp-add">
            <AddToCart product={product} display="icon" size={Array.isArray(sizes) ? (sizes[1] || sizes[0]) : 'M'} />
          </div>
        </div>
      </div>
    </article>
  );
}
