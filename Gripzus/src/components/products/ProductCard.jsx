import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

/* Gripzus ProductCard — editorial gallery, elevated.
   A framed image on warm paper with a quiet dual-image hover, corner pills
   (discount + badge), a glass wishlist mark, and a circular quick-add that
   reveals on hover (and stays visible on touch). Caption below: collection,
   name, price and colour dots. Shared component — identical wherever it
   renders (bestsellers, catalogue, search, wishlist, related). */

const MAX_DOTS = 5;
const FALLBACK_IMG = '/assets/Gripzus.JPG.jpeg';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [added, setAdded] = useState(false);

  const slug    = product.slug || product.handle || product.id;
  const name    = product.name || 'Gripzus Pair';
  const price   = Number(product.salePrice ?? product.price ?? 0);
  const compare = product.salePrice ? Number(product.price) : (product.compareAtPrice ? Number(product.compareAtPrice) : null);
  const images  = product.images || [];
  const primary   = images[0] || FALLBACK_IMG;
  const collection = product.collection || product.collectionName || 'Gripzus';
  const inStock   = product.inStock !== false;
  const badge     = product.badge;
  const wished    = has(product.id);
  const off = compare && compare > price ? Math.round((1 - price / compare) * 100) : 0;

  // Flatten multi-colour packs so each colour shows as its own dot.
  const colors    = product.colors || [];
  const dots      = colors.flatMap((c) => (Array.isArray(c.packColors) ? c.packColors : [c]));
  const visibleColors = dots.slice(0, MAX_DOTS);
  const extraColors   = dots.length - MAX_DOTS;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
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

      {/* ── Image frame ─────────────────────────────────────────── */}
      <div className="relative">
        <Link
          href={`/products/${slug}`}
          className="media-zoom relative block aspect-[4/5] overflow-hidden rounded-xl border border-line bg-paper-warm"
        >
          <img src={primary} alt={name} loading="lazy"
               className="absolute inset-0 w-full h-full object-cover" />

          {/* subtle darkening on hover to lift the image off the page */}
          <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/[0.04] transition-colors duration-500" />

          {!inStock && (
            <div className="absolute inset-0 bg-paper/65 flex items-center justify-center">
              <span className="eyebrow text-ink">Sold out</span>
            </div>
          )}
        </Link>

        {/* Corner pills — discount + badge, top-left */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 z-10 pointer-events-none">
          {off > 0 && (
            <span className="inline-flex items-center rounded-full bg-ink text-paper text-[10px] font-medium tracking-[0.08em] px-2.5 py-1">
              −{off}%
            </span>
          )}
          {badge && (
            <span className="inline-flex items-center rounded-full bg-paper/95 text-ink text-[10px] font-medium tracking-[0.12em] uppercase px-2.5 py-1 shadow-soft">
              {badge}
            </span>
          )}
        </div>

        {/* Wishlist — glass mark, top-right (always visible on touch) */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); toggle(product); }}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-paper/85 backdrop-blur-sm text-ink shadow-soft transition-all duration-300 hover:bg-paper opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24"
               fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
            <path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" />
          </svg>
        </button>

        {/* Quick add — circular, reveals on hover, persistent on touch */}
        {inStock && (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={added ? 'Added to bag' : 'Add to bag'}
            className="absolute bottom-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-ink text-paper shadow-card transition-all duration-300 hover:scale-105 active:scale-95 opacity-100 translate-y-0 md:opacity-0 md:translate-y-1.5 md:group-hover:opacity-100 md:group-hover:translate-y-0"
          >
            {added ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            )}
          </button>
        )}
      </div>

      {/* ── Caption ─────────────────────────────────────────────── */}
      <div className="pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow text-ink-muted truncate">{collection}</span>
          {colors.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {visibleColors.map((c, i) => (
                <span key={c.name || i} title={c.name}
                      className="w-2.5 h-2.5 rounded-full ring-1 ring-line"
                      style={{ backgroundColor: c.hex }} />
              ))}
              {extraColors > 0 && <span className="text-[10px] text-ink-muted ml-0.5">+{extraColors}</span>}
            </div>
          )}
        </div>

        <Link href={`/products/${slug}`} className="block mt-1.5">
          <h3 className="text-[13px] text-ink leading-snug line-clamp-1">{name}</h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[13px] text-ink">₹{price.toLocaleString('en-IN')}</span>
            {compare && compare > price && (
              <span className="text-[12px] text-ink-muted line-through">₹{compare.toLocaleString('en-IN')}</span>
            )}
          </div>
        </Link>
      </div>
    </article>
  );
}
