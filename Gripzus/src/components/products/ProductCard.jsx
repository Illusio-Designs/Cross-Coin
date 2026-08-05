import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { resolveVariationId } from '../../services/products';

/* Gripzus ProductCard — "GROUND INDEX" architectural gallery card.
   A 1px-framed image (no shadow, square corners), square black index/discount
   tabs, a minimal hairline wishlist mark, and a hairline-topped metadata block
   where name + price share a baseline and an always-visible "＋ Add" fills
   black on hover. Shared component — identical wherever it renders. */

const MAX_DOTS = 5;
const FALLBACK_IMG = '/assets/Gripzus.JPG.jpeg';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [added, setAdded] = useState(false);

  const slug    = product.slug || product.handle || product.id;
  const href    = product.colorParam
    ? `/products/${slug}?color=${encodeURIComponent(product.colorParam)}`
    : `/products/${slug}`;
  const name    = product.name || 'Gripzus Pair';
  const price   = Number(product.salePrice ?? product.price ?? 0);
  const compare = product.salePrice ? Number(product.price) : (product.compareAtPrice ? Number(product.compareAtPrice) : null);
  const images  = product.images || [];
  const primary   = images[0] || FALLBACK_IMG;
  const collection = product.collection || product.collectionName || 'Gripzus';
  const inStock   = product.inStock !== false;
  const badge     = product.badge;
  const wished    = has(product.uid || product.id); // per-colour variant, not the shared product id
  const off = compare && compare > price ? Math.round((1 - price / compare) * 100) : 0;

  const colors    = product.colors || [];
  const dots      = colors.flatMap((c) => (Array.isArray(c.packColors) ? c.packColors : [c]));
  const visibleColors = dots.slice(0, MAX_DOTS);
  const extraColors   = dots.length - MAX_DOTS;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Prefer THIS card's colour (exploded variant) over the base product's
    // default, so a Beige card adds Beige — not the product's first colour.
    const defaultColor = product.colorParam || colors[0]?.name || product.color || '';
    const defaultSize  = product.size || (product.sizes || [])[0] || '';
    addItem({
      id: product.id, name, slug, image: primary,
      price: Number(product.price ?? price),
      salePrice: product.salePrice != null ? Number(product.salePrice) : undefined,
      collection, size: defaultSize, color: defaultColor, qty: 1,
      variationId: resolveVariationId(product, defaultColor, defaultSize),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article className="group flex h-full flex-col">

      {/* ── Image — 1px architectural frame on warm paper ─────────── */}
      <div className="relative border border-line overflow-hidden bg-paper-warm">
        <Link href={href} className="relative block aspect-[4/5] overflow-hidden">
          <img src={primary} alt={name} loading="lazy"
               className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]" />
          {!inStock && (
            <div className="absolute inset-0 bg-paper/70 backdrop-blur-[1px] flex items-center justify-center">
              <span className="eyebrow text-ink">Sold out</span>
            </div>
          )}
        </Link>

        {/* Square index tabs — discount (solid) + badge (outline), top-left */}
        <div className="absolute top-0 left-0 flex flex-col items-start z-10 pointer-events-none">
          {off > 0 && (
            <span className="bg-ink text-paper text-[10px] font-medium tracking-[0.1em] px-2.5 py-1 tabular-nums">−{off}%</span>
          )}
          {badge && (
            <span className="bg-paper text-ink text-[9.5px] font-medium tracking-[0.14em] uppercase px-2.5 py-1 border-l border-b border-line">{badge}</span>
          )}
        </div>

        {/* Wishlist — minimal square hairline mark, top-right */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); toggle(product); }}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute top-0 right-0 z-10 w-9 h-9 flex items-center justify-center bg-paper/85 backdrop-blur-sm text-ink border-l border-b border-line transition-colors hover:bg-paper"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
            <path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" />
          </svg>
        </button>
      </div>

      {/* ── Metadata block — hairline system ──────────────────────── */}
      <div className="flex flex-1 flex-col">
        {/* collection + colour dots row */}
        <div className="flex items-center justify-between gap-2 pt-3">
          <span className="eyebrow text-ink-muted truncate">{collection}</span>
          {colors.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {visibleColors.map((c, i) => (
                <span key={c.name || i} title={c.name} className="w-2.5 h-2.5 rounded-full ring-1 ring-line" style={{ backgroundColor: c.hex }} />
              ))}
              {extraColors > 0 && <span className="text-[10px] text-ink-muted ml-0.5">+{extraColors}</span>}
            </div>
          )}
        </div>

        {/* name + price share a baseline */}
        <Link href={href} className="mt-1.5 flex items-baseline justify-between gap-3">
          <h3 className="h-display text-[14px] text-ink leading-snug truncate">{name}</h3>
          <span className="shrink-0 flex items-baseline gap-1.5">
            {compare && compare > price && (
              <span className="text-[11.5px] text-ink-muted line-through tabular-nums">₹{compare.toLocaleString('en-IN')}</span>
            )}
            <span className="text-[13.5px] text-ink tabular-nums">₹{price.toLocaleString('en-IN')}</span>
          </span>
        </Link>

        {/* Add — hairline-topped, always visible, fills black on hover */}
        {inStock ? (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={added ? 'Added to bag' : 'Add to bag'}
            className="mt-3 flex items-center justify-center gap-2 border-t border-line pt-3 text-[10.5px] font-medium tracking-[0.18em] uppercase text-ink transition-colors hover:text-ink-muted"
          >
            {added ? (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Added</>
            ) : (
              <><span aria-hidden="true" className="text-[13px] leading-none">＋</span> Add to bag</>
            )}
          </button>
        ) : (
          <div className="mt-3 border-t border-line pt-3 text-[10.5px] font-medium tracking-[0.18em] uppercase text-ink-muted text-center">Sold out</div>
        )}
      </div>
    </article>
  );
}
