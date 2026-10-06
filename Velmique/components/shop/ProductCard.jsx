'use client';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';

// Request a card-sized image from ImageKit (WebP/AVIF via f-auto) instead of
// loading the full-resolution original. Only rewrites ImageKit URLs; other
// sources (and empty values) pass through unchanged.
const cardImg = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('ik.imagekit.io')) return url;
  return `${url.split('?')[0]}?tr=w-600,q-75,f-auto`;
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/* Maison product card — a calm image panel with the name, category and price
   set in the house serif. The dark "Add to bag" bar slides up on hover; the
   wishlist heart sits quietly in the top corner. Shared by the homepage
   collection grid and every shop / collection / search listing. */
export default function ProductCard({ product, index = 0 }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const wishlisted = isWishlisted(product.id);

  const defVar = () =>
    product.variations?.find((v) => v.id === product.defaultVariationId) ||
    product.variations?.[0];

  const handleWishlist = (e) => {
    e.preventDefault();
    const v = defVar();
    toggleWishlist({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0],
      slug: product.slug,
      variationId: v?.id || product.defaultVariationId || null,
      size: v?.size || '',
      color: v?.colors?.[0] || '',
    });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const v = defVar();
    addToCart({
      id: `${product.id}:${v?.id || 'default'}`,
      productId: product.id,
      variationId: v?.id || product.defaultVariationId || null,
      name: product.name,
      price: product.price,
      image: product.images?.[0],
      slug: product.slug,
      size: v?.size || '',
      color: v?.colors?.[0] || '',
    });
  };

  return (
    <motion.article
      className="group relative"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative overflow-hidden bg-[var(--surface-2)]" style={{ aspectRatio: '0.8' }}>
          {/* Badge — top-left */}
          {product.badge && (
            <span className="absolute top-3 left-3 z-20 bg-white text-[var(--ink)] px-3 py-2 text-[8px] tracking-[0.18em] uppercase">
              {product.badge}
            </span>
          )}

          {/* Wishlist — top-right, quiet */}
          <button
            onClick={handleWishlist}
            aria-label="Add to wishlist"
            className={`absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              wishlisted
                ? 'bg-[var(--gold)] text-[var(--ink)]'
                : 'bg-white/85 text-[var(--ink)] hover:bg-white'
            }`}
          >
            <Heart size={12} fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={1.6} />
          </button>

          {/* Primary image */}
          <img
            src={cardImg(product.images?.[0])}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          {/* Secondary image fades in on hover when present */}
          {product.images?.[1] && (
            <img
              src={cardImg(product.images[1])}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
          )}

          {!product.inStock && (
            <div className="absolute inset-0 bg-[var(--bg)]/75 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-[var(--ink)] text-[10px] tracking-[0.4em] uppercase border border-[var(--border)] px-5 py-1.5">
                Sold Out
              </span>
            </div>
          )}

          {/* Add to bag — dark bar slides up on hover */}
          {product.inStock && (
            <button
              onClick={handleAdd}
              className="absolute bottom-0 left-0 right-0 z-10 bg-[rgba(17,16,14,0.92)] text-white py-4 text-[9px] tracking-[0.22em] uppercase translate-y-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100"
            >
              Add to bag
            </button>
          )}
        </div>
      </Link>

      {/* Caption */}
      <div className="pt-5 pb-1">
        <p className="text-[var(--gold-deep)] text-[8px] tracking-[0.22em] uppercase font-body">
          {product.collection || 'Signature Fragrance'}
        </p>
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-serif text-[var(--ink)] leading-none mt-2 transition-colors group-hover:text-[var(--gold-deep)]"
            style={{ fontSize: 'clamp(1.35rem, 2.4vw, 1.75rem)' }}>
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2.5 mt-2">
          <span className="text-[var(--ink)] text-[13px] font-body font-medium">{inr(product.price)}</span>
          {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
            <span className="text-[var(--ink-muted)] text-[11px] line-through">{inr(product.originalPrice)}</span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
