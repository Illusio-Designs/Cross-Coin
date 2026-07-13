'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useWishlistStore } from '@/store/wishlistStore';
import { toastAddedToCart } from '@/lib/toast';

/**
 * ProductCard — Celestique pedestal card.
 * The piece floats on a soft cream pedestal; a serif small-caps name, a metal
 * note, and a gold price sit quietly beneath. No boxes, no clutter.
 */
export function ProductCard({ product, variant = 'light' }) {
  const [addedFeedback, setAddedFeedback] = useState(false);
  const { addItem } = useCart();
  const wishlisted = useWishlistStore((s) => s.hasItem(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const firstColor = product.colors?.[0]?.name ?? '';
    const cartVariant =
      product.variants?.find((v) => v.color === firstColor) ||
      product.variants?.[0];
    const colorImages = (firstColor && product.colorImages?.[firstColor]) || [];
    const imageUrl =
      colorImages[0]?.url || product.images?.[0]?.url || '';

    addItem({
      id: cartVariant?.id ?? product.id,
      productId: product.id,
      variantId: cartVariant?.id ?? 'one-size',
      name: product.name,
      color: firstColor || 'Default',
      size: 'One Size',
      price: product.price,
      quantity: 1,
      imageUrl,
      handle: product.handle ?? product.slug ?? String(product.id),
    });
    toastAddedToCart(product.name);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  const primaryImage = product.images?.[0];
  const hoverImage = product.images?.[1] ?? primaryImage;
  const slug = product.handle ?? product.slug ?? String(product.id);
  const metal = product.metal || product.material || '18k yellow gold';

  return (
    <Link
      href={`/products/${slug}`}
      className="group relative flex flex-col focus-visible:outline-none"
    >
      {/* ── Pedestal image ─────────────────────────────────────────── */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-cream ring-1 ring-line transition-all duration-500 group-hover:ring-gold/40 group-hover:shadow-[0_26px_54px_-30px_rgba(60,45,20,0.35)]">
        {/* soft pedestal glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_36%_at_50%_74%,rgba(255,255,255,0.9)_0%,transparent_70%),radial-gradient(75%_60%_at_50%_38%,#faf6ee_0%,transparent_62%)]" />

        {primaryImage?.url ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage?.alt || product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain object-center p-6 transition-transform duration-[1600ms] ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-mist" />
        )}

        {product.badge && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-cream/85 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.24em] text-ink backdrop-blur-sm">
            {product.badge}
          </span>
        )}

        <motion.button
          type="button"
          onClick={handleWishlist}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-cream/85 backdrop-blur-sm transition-colors duration-200 hover:bg-cream"
        >
          <Heart
            size={13}
            className={wishlisted ? 'text-gold fill-gold' : 'text-ink/45'}
            strokeWidth={1.8}
          />
        </motion.button>

        {/* Quick add — quiet pill, appears on hover */}
        <div className="absolute inset-x-3 bottom-3 z-10 translate-y-3 opacity-0 transition-all duration-400 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={handleAddToCart}
            className={`w-full rounded-full py-2.5 text-[9.5px] font-semibold uppercase tracking-[0.24em] transition-all duration-300 ${
              addedFeedback
                ? 'bg-gold text-cream'
                : 'bg-[#1e1912] text-cream hover:bg-black'
            }`}
          >
            {addedFeedback ? 'Added ✓' : 'Add to bag'}
          </button>
        </div>
      </div>

      {/* ── Caption ────────────────────────────────────────────────── */}
      <div className="px-1 pt-4 text-center">
        <p className="font-display text-[13px] uppercase leading-tight tracking-[0.06em] text-ink">
          {product.name}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-text-faint">
          {metal}
        </p>
        <div className="mt-2 flex items-baseline justify-center gap-2">
          <p className="font-display text-[15px] text-gold">
            {formatPrice(product.price)}
          </p>
          {product.compareAtPrice && (
            <p className="text-[11px] line-through text-text-faint">
              {formatPrice(product.compareAtPrice)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
