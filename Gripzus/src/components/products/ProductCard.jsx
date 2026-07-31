import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

/* Gripzus ProductCard — editorial gallery (SSENSE-inspired).
   A clean image on white — no border, no shadow, no radius — with a quiet
   hover (2nd image or gentle zoom), a subtle wishlist mark and a tiny
   caption below: name + price in small type. Shared component — identical
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

      {/* ── Image — clean, sharp, edge-to-edge ─────────────────── */}
      <div className="relative">
        <Link href={`/products/${slug}`} className="media-zoom relative block overflow-hidden bg-paper-warm">
          <img
            src={primary}
            alt={name}
            className="block w-full h-auto"
          />
          {secondary && (
            <img
              src={secondary}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            />
          )}

          {/* Badge — quiet uppercase label, no block */}
          {badge && (
            <span className="eyebrow absolute top-3 left-3 text-ink z-10">
              {badge}
            </span>
          )}

          {/* Wishlist — minimal mark, no frame */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); toggle(product); }}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center text-ink transition-opacity hover:opacity-55 z-10"
          >
            <svg width="15" height="15" viewBox="0 0 24 24"
                 fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
              <path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" />
            </svg>
          </button>

          {!inStock && (
            <div className="absolute inset-0 bg-paper/60 flex items-center justify-center">
              <span className="eyebrow text-ink">Sold out</span>
            </div>
          )}
        </Link>

        {/* Add to bag — quiet underlined link, reveals on hover */}
        {inStock && (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={added ? 'Added to bag' : 'Add to bag'}
            className="link-line absolute bottom-3 left-3 bg-paper/95 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          >
            {added ? 'Added' : 'Add to bag'}
          </button>
        )}
      </div>

      {/* ── Caption — tiny name + price below ──────────────────── */}
      <div className="pt-3.5">
        <span className="eyebrow text-ink-muted">{collection}</span>

        <Link href={`/products/${slug}`} className="block mt-1.5">
          <h3 className="text-[13px] text-ink leading-snug line-clamp-1">{name}</h3>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[13px] text-ink">₹{price.toLocaleString('en-IN')}</span>
            {compare && compare > price && (
              <span className="text-[12px] text-ink-muted line-through">₹{compare.toLocaleString('en-IN')}</span>
            )}
          </div>
        </Link>

        {colors.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5">
            {visibleColors.map((c) => (
              <span
                key={c.name}
                title={c.name}
                className="w-2.5 h-2.5 rounded-full ring-1 ring-line"
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
