import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

/* Gripzus ProductCard — bold athletic / performance, monochrome.
   Square hover-zoom media, solid-ink badges, uppercase heavy name,
   ink price, square quick-add + wishlist. Shared component — identical
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
  const onSale    = compare && compare > price;
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

      {/* ── Image + actions ───────────────────────────────────── */}
      <div className="relative border-2 border-ink">
        <Link href={`/products/${slug}`} className="media-zoom relative block aspect-square bg-paper-warm">
          <img
            src={primary}
            alt={name}
            className="block w-full h-full object-cover"
          />
          {secondary && (
            <img
              src={secondary}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />
          )}

          {/* Badges — solid ink blocks, never colored */}
          <div className="absolute top-0 left-0 flex flex-col">
            {badge && (
              <span className="bg-ink text-paper text-[9px] sm:text-[10px] font-bold tracking-[0.16em] uppercase px-2.5 py-1.5">
                {badge}
              </span>
            )}
            {onSale && (
              <span className="bg-ink text-paper text-[9px] sm:text-[10px] font-bold tracking-[0.16em] uppercase px-2.5 py-1.5">
                Sale
              </span>
            )}
          </div>

          {/* Wishlist — square, hard corner */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); toggle(product); }}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute top-0 right-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center border-l-2 border-b-2 border-ink transition-colors ${
              wished ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink hover:text-paper'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24"
                 fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" />
            </svg>
          </button>

          {!inStock && (
            <div className="absolute inset-0 bg-paper/80 flex items-center justify-center">
              <span className="bg-ink text-paper text-[11px] font-bold tracking-[0.2em] uppercase px-4 py-2">
                Sold Out
              </span>
            </div>
          )}
        </Link>

        {/* Quick-add — full-width bar, slides up on hover */}
        {inStock && (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={added ? 'Added to bag' : 'Add to bag'}
            className={`absolute inset-x-0 bottom-0 h-11 flex items-center justify-center gap-2 border-t-2 border-ink text-[11px] font-bold tracking-[0.16em] uppercase transition-all duration-200 translate-y-full group-hover:translate-y-0 focus:translate-y-0 ${
              added ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink hover:text-paper'
            }`}
          >
            {added ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Added
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7h12l-1.5 11a2 2 0 01-2 1.8h-5a2 2 0 01-2-1.8L6 7z" /><path d="M9 7V5a3 3 0 016 0v2" /></svg>
                Add to Bag
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Info ──────────────────────────────────────────────── */}
      <div className="pt-4">
        <Link href={`/products/${slug}`} className="block">
          <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-ink-muted mb-1.5">{collection}</p>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <h3 className="font-heavy text-ink text-[15px] sm:text-[16px] font-800 uppercase tracking-tight leading-tight line-clamp-2 sm:line-clamp-1" style={{ fontWeight: 800 }}>{name}</h3>
            <div className="shrink-0 flex items-baseline gap-1.5">
              <span className="font-display text-ink text-[16px] sm:text-[18px] leading-none" style={{ fontWeight: 900 }}>₹{price.toLocaleString('en-IN')}</span>
              {onSale && (
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
                className="w-3.5 h-3.5 border border-ink"
                style={{ backgroundColor: c.hex }}
              />
            ))}
            {extraColors > 0 && (
              <span className="text-[11px] font-bold text-ink-muted ml-0.5">+{extraColors}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
