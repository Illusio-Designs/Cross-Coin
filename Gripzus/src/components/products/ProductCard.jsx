import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

/* Gripzus ProductCard — techwear / performance-luxe.
   Gentle-radius image framed by a hairline, a mono spec row (collection +
   stock index), Space Grotesk name, monospace price-as-data, a squared
   steel Add action and a minimal wishlist tick. Shared component —
   identical wherever it renders. */

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
        <Link href={`/products/${slug}`} className="media-zoom relative block overflow-hidden rounded-[16px] bg-paper-warm border border-line shadow-soft">
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

          {/* Badge — mono spec chip */}
          {badge && (
            <span className="spec absolute top-3 left-3 bg-paper/95 backdrop-blur-sm text-ink border border-line px-2 py-0.5 rounded sm:top-3.5 sm:left-3.5">
              {badge}
            </span>
          )}

          {/* Wishlist tick */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); toggle(product); }}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded border border-line bg-paper/85 backdrop-blur-sm transition-all hover:bg-paper hover:border-accent sm:top-3 sm:right-3 sm:w-9 sm:h-9"
          >
            <svg width="14" height="14" viewBox="0 0 24 24"
                 fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6"
                 className={wished ? 'text-accent' : 'text-ink'}>
              <path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" />
            </svg>
          </button>

          {!inStock && (
            <div className="absolute inset-0 bg-paper/75 flex items-center justify-center">
              <span className="spec text-ink border border-ink px-4 py-1.5 rounded bg-paper shadow-soft">
                SOLD OUT
              </span>
            </div>
          )}
        </Link>

        {/* Squared Add-to-Bag — tucked at the image corner */}
        {inStock && (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={added ? 'Added to bag' : 'Add to bag'}
            className={`absolute -bottom-4 right-3.5 w-10 h-10 rounded-lg flex items-center justify-center shadow-card transition-all duration-200 hover:scale-105 sm:-bottom-5 sm:right-4 sm:w-12 sm:h-12 ${
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

      {/* ── Info — datasheet block ────────────────────────────── */}
      <div className="pt-6 pr-1">
        {/* mono spec row: collection + stock state */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <span className="spec uppercase tracking-[0.14em] truncate">{collection}</span>
          <span className={`spec inline-flex items-center gap-1.5 shrink-0 ${inStock ? 'text-ink-soft' : 'text-ink-muted'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${inStock ? 'bg-accent' : 'bg-line'}`} />
            {inStock ? 'IN STOCK' : 'OUT'}
          </span>
        </div>

        <Link href={`/products/${slug}`} className="block">
          <h3 className="h-display text-ink text-[17px] sm:text-[19px] leading-snug line-clamp-2 sm:line-clamp-1 transition-colors group-hover:text-accent-deep">{name}</h3>

          {/* price-as-data — mono, on a hairline */}
          <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
            <span className="spec text-ink-muted">PRICE</span>
            <div className="flex items-baseline gap-1.5">
              {compare && compare > price && (
                <span className="font-mono text-ink-muted text-[12px] line-through">₹{compare.toLocaleString('en-IN')}</span>
              )}
              <span className="font-mono text-ink text-[15px] font-bold">₹{price.toLocaleString('en-IN')}</span>
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
              <span className="spec text-ink-muted ml-0.5">+{extraColors}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
