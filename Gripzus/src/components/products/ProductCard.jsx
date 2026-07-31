import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

/* Gripzus ProductCard — premium editorial.
   Auto-height image, a circular Add-to-Bag action tucked at the image
   corner, refined chip badge, minimal heart, collection eyebrow, and a
   serif name + price on one baseline. Shared component — identical
   wherever it renders. */

const MAX_DOTS = 5;

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [added, setAdded] = useState(false);

  const slug    = product.slug || product.handle || product.id;
  const name    = product.name || 'Gripzus Pair';
  const price   = Number(product.salePrice ?? product.price ?? 0);
  const compare = product.salePrice ? Number(product.price) : (product.compareAtPrice ? Number(product.compareAtPrice) : null);
  const images  = product.images || [];
  const primary   = images[0] || '/assets/Gripzus.JPG.jpeg';
  const secondary = images[1];
  const collection = product.collection || product.collectionName || 'Gripzus';
  const inStock   = product.inStock !== false;
  const badge     = product.badge;
  const wished    = has(product.id);
  // Flatten multi-colour packs so each colour shows as its own dot.
  const colors    = product.colors || [];
  const dots      = colors.flatMap((c) => (Array.isArray(c.packColors) ? c.packColors : [c]));
  const visibleColors = dots.slice(0, MAX_DOTS);
  const extraColors   = dots.length - MAX_DOTS;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // No picker on the card — default to the product's first colour/size.
    const defaultColor = product.color || colors[0]?.name || '';
    const defaultSize  = product.size || (product.sizes || [])[0] || '';
    addItem({
      id: product.id, name, slug, image: primary,
      price: Number(product.price ?? price),
      salePrice: product.salePrice != null ? Number(product.salePrice) : undefined,
      collection, size: defaultSize, color: defaultColor, qty: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article className="group flex flex-col">

      {/* ── Image + floating action ───────────────────────────── */}
      <div className="relative">
        <Link href={`/products/${slug}`} className="media-zoom relative block overflow-hidden rounded-[22px] bg-paper-warm border border-line shadow-soft">
          <img
            src={primary}
            alt={name}
            className="block w-full h-auto"
          />
          {secondary && (
            <img
              src={secondary}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />
          )}

          {/* Badge — light frosted chip */}
          {badge && (
            <span className="absolute top-3 left-3 bg-paper/95 backdrop-blur-sm text-ink text-[8px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-full shadow-soft sm:top-3.5 sm:left-3.5 sm:text-[10px] sm:tracking-[0.16em] sm:px-2.5 sm:py-1">
              {badge}
            </span>
          )}

          {/* Wishlist heart */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); toggle(product); }}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full bg-paper/85 backdrop-blur-sm transition-all hover:bg-paper hover:scale-105 sm:top-3 sm:right-3 sm:w-9 sm:h-9"
          >
            <svg width="14" height="14" viewBox="0 0 24 24"
                 fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6"
                 className="text-ink">
              <path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" />
            </svg>
          </button>

          {!inStock && (
            <div className="absolute inset-0 bg-paper/75 flex items-center justify-center">
              <span className="text-ink text-[11px] tracking-[0.2em] uppercase border border-line px-4 py-1.5 rounded-full bg-paper shadow-soft">
                Sold Out
              </span>
            </div>
          )}
        </Link>

        {/* Circular Add-to-Bag — tucked at the image corner */}
        {inStock && (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={added ? 'Added to bag' : 'Add to bag'}
            className={`absolute -bottom-4 right-3.5 w-10 h-10 rounded-full flex items-center justify-center shadow-card transition-all duration-200 hover:scale-110 sm:-bottom-5 sm:right-4 sm:w-12 sm:h-12 ${
              added ? 'bg-accent text-paper' : 'bg-ink text-paper hover:bg-accent'
            }`}
          >
            {added ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7h12l-1.5 11a2 2 0 01-2 1.8h-5a2 2 0 01-2-1.8L6 7z" /><path d="M9 7V5a3 3 0 016 0v2" /></svg>
            )}
          </button>
        )}
      </div>

      {/* ── Info ──────────────────────────────────────────────── */}
      <div className="pt-7 pr-1">
        <Link href={`/products/${slug}`} className="block">
          <p className="text-[10px] tracking-[0.24em] uppercase text-ink-muted mb-2">{collection}</p>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <h3 className="h-display text-ink text-[17px] sm:text-[19px] leading-snug line-clamp-2 sm:line-clamp-1 transition-colors group-hover:text-accent-deep">{name}</h3>
            <div className="shrink-0 flex items-baseline gap-1.5">
              <span className="h-display text-accent-deep text-[17px] sm:text-[19px] leading-none">₹{price.toLocaleString('en-IN')}</span>
              {compare && compare > price && (
                <span className="text-ink-muted text-[12px] line-through">₹{compare.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>
        </Link>

        {colors.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3">
            {visibleColors.map((c) => (
              <span
                key={c.name}
                title={c.name}
                className="w-3.5 h-3.5 rounded-full ring-1 ring-line ring-offset-1 ring-offset-paper"
                style={{ backgroundColor: c.hex }}
              />
            ))}
            {extraColors > 0 && (
              <span className="text-[11px] text-ink-muted ml-0.5">+{extraColors}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
