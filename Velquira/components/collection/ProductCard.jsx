'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useWishlistStore } from '@/store/wishlistStore';
import { toastAddedToCart } from '@/lib/toast';

/**
 * ProductCard — premium jewellery card.
 *
 * Bordered rounded card with a primary/hover image cross-fade, badge +
 * wishlist heart, a single name-and-price row, and an add-to-bag CTA.
 * Gold hairline border, warm-cream image bed, serif typography.
 */
export function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);
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
    const variant =
      product.variants?.find((v) => v.color === firstColor) ||
      product.variants?.[0];
    const colorImages = (firstColor && product.colorImages?.[firstColor]) || [];
    const imageUrl =
      colorImages[0]?.url || product.images?.[0]?.url || '';

    addItem({
      id: variant?.id ?? product.id,
      productId: product.id,
      variantId: variant?.id ?? 'one-size',
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

  return (
    <Link
      href={`/products/${slug}`}
      className="group flex flex-col rounded-2xl border border-gold/20 bg-white p-3 transition-[border-color,box-shadow] duration-300 hover:border-gold/55 hover:shadow-[0_22px_45px_-26px_rgba(143,102,32,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-cream">
        <AnimatePresence initial={false}>
          <motion.div
            key={hovered ? 'h' : 'p'}
            className="absolute inset-0 p-5 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {primaryImage?.url ? (
              <Image
                src={hovered ? hoverImage?.url || primaryImage.url : primaryImage.url}
                alt={(hovered ? hoverImage?.alt : primaryImage?.alt) || product.name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-contain object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-cream" />
            )}
          </motion.div>
        </AnimatePresence>

        {product.badge && (
          <div className="absolute left-2.5 top-2.5 max-w-[60%]">
            <span className="block truncate rounded-full border border-gold/45 bg-white/95 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.22em] text-gold">
              {product.badge}
            </span>
          </div>
        )}

        {/* Wishlist heart — top-right */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm transition-all duration-200 hover:scale-110 hover:bg-white"
        >
          <Heart
            size={14}
            className={wishlisted ? 'text-gold' : 'text-brand-black/70'}
            fill={wishlisted ? 'currentColor' : 'none'}
            strokeWidth={1.7}
          />
        </button>
      </div>

      {/* Info */}
      <div className="mt-3.5 px-1">
        {product.collectionName && (
          <p className="truncate text-[9px] font-medium uppercase tracking-[0.28em] text-gold">
            {product.collectionName}
          </p>
        )}

        {/* Name + price — single row */}
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate font-display text-[15px] leading-tight text-brand-black">
            {product.name}
          </p>
          <div className="flex shrink-0 items-baseline gap-1.5">
            <p className="font-display text-[15px] font-medium text-brand-black">
              {formatPrice(product.price)}
            </p>
            {product.compareAtPrice && (
              <p className="text-[12px] text-brand-black/35 line-through">
                {formatPrice(product.compareAtPrice)}
              </p>
            )}
          </div>
        </div>

        {/* Add to Bag */}
        <button
          aria-label="Add to bag"
          onClick={handleAddToCart}
          className={`mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors duration-200 ${
            addedFeedback
              ? 'border-gold bg-gold text-brand-black'
              : 'border-gold/40 text-brand-black hover:border-brand-black hover:bg-brand-black hover:text-white'
          }`}
        >
          <ShoppingBag size={12} strokeWidth={1.6} />
          {addedFeedback ? 'Added' : 'Add to Bag'}
        </button>
      </div>
    </Link>
  );
}