import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

/* Gripzus ProductCard — premium minimal.
   Image · badge · wishlist heart, then a single title+price row,
   colour dots, and a full-width Add to Bag button. */

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
  const inStock   = product.inStock !== false;
  const badge     = product.badge;
  const wished    = has(product.id);
  const colors    = product.colors || [];
  const visibleColors = colors.slice(0, MAX_DOTS);
  const extraColors   = colors.length - MAX_DOTS;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id, name, slug, image: primary,
      price: Number(product.price ?? price),
      salePrice: product.salePrice != null ? Number(product.salePrice) : undefined,
      collection: product.collection || '', size: product.size || '', color: product.color || '', qty: 1,
    }, { openDrawer: false });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article className="group flex flex-col">
      {/* Image */}
      <Link href={`/products/${slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-lg bg-gray-100">
        <img src={primary} alt={name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        {secondary && (
          <img src={secondary} alt={name} className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}

        {badge && (
          <span className="absolute top-3 left-3 bg-ink text-paper text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 rounded-sm">
            {badge}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); toggle(product); }}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-paper/90 backdrop-blur-sm flex items-center justify-center transition-colors hover:bg-paper"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={wished ? 'var(--clay)' : 'none'} stroke={wished ? 'var(--clay)' : 'currentColor'} strokeWidth="1.6" className="text-ink">
            <path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" />
          </svg>
        </button>

        {!inStock && (
          <div className="absolute inset-0 bg-paper/75 flex items-center justify-center">
            <span className="text-ink text-[11px] tracking-[0.18em] uppercase border border-ink px-4 py-1.5 rounded-sm bg-paper">Sold Out</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="pt-3.5 flex flex-col flex-1">
        <Link href={`/products/${slug}`} className="block">
          {/* Title + price — single row */}
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="h-display text-[17px] text-ink leading-snug line-clamp-1">{name}</h3>
            <div className="shrink-0 flex items-baseline gap-1.5">
              <span className="text-ink font-medium text-[15px]">₹{price.toLocaleString('en-IN')}</span>
              {compare && compare > price && (
                <span className="text-ink-muted text-[12px] line-through">₹{compare.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>

          {/* Colour dots */}
          {colors.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              {visibleColors.map((c) => (
                <span
                  key={c.name}
                  title={c.name}
                  className="w-3.5 h-3.5 rounded-full border border-line"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              {extraColors > 0 && (
                <span className="text-[11px] text-ink-muted ml-0.5">+{extraColors}</span>
              )}
            </div>
          )}
        </Link>

        {inStock && (
          <button
            type="button"
            onClick={handleAdd}
            className={`mt-3.5 w-full flex items-center justify-center gap-2 py-2.5 rounded-sm border text-[11px] font-medium tracking-[0.1em] uppercase transition-colors ${
              added
                ? 'bg-clay border-clay text-paper'
                : 'border-line text-ink hover:bg-ink hover:border-ink hover:text-paper'
            }`}
          >
            {added ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Added to bag
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7h12l-1.5 11a2 2 0 01-2 1.8h-5a2 2 0 01-2-1.8L6 7z" /><path d="M9 7V5a3 3 0 016 0v2" /></svg>
                Add to Bag
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}
