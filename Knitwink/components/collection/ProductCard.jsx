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


const MAX_DOTS = 5;





export function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
    const firstColor = product.colors[0]?.name ?? ''
    const variant = product.variants?.find(v => v.color === firstColor) || product.variants?.[0]
    const colorImages = (firstColor && product.colorImages?.[firstColor]) || []
    const imageUrl = colorImages[0]?.url || product.images[0]?.url || ''
    addItem({
      id: variant?.id ?? product.id,
      productId: product.id,
      variantId: variant?.id ?? 'free-size',
      name: product.name,
      color: firstColor || 'Default',
      size: 'Free Size',
      price: product.price,
      quantity: 1,
      imageUrl,
      handle: product.handle,
    });
    toastAddedToCart(product.name);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  const primaryImage = product.images[0];
  const hoverImage = product.images[1] ?? primaryImage;

  // Flatten multi-color packs into individual swatches so a "Pack of 5"
  // shows all 5 colours instead of just the pack's representative dot.
  const swatches = product.colors.flatMap((c) =>
    c.packColors?.length
      ? c.packColors.map((pc) => ({ name: pc.name, hex: pc.hex }))
      : [{ name: c.name, hex: c.hex }]
  );
  const overflow = swatches.length - MAX_DOTS;
  const visibleColors = expanded ? swatches : swatches.slice(0, MAX_DOTS);

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-3 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
        <AnimatePresence initial={false}>
          <motion.div
            key={hovered ? 'h' : 'p'}
            className="absolute inset-0 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}>
            
            <Image
              src={hovered ? hoverImage.url : primaryImage.url}
              alt={hovered ? hoverImage.alt : primaryImage.alt}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain object-center" />
            
          </motion.div>
        </AnimatePresence>

        {product.badge &&
        <div className="absolute left-2 top-2 max-w-[60%]">
            <span className="block truncate rounded-full bg-brand-black px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white sm:px-2.5 sm:py-1 sm:text-[10px]">
              {product.badge}
            </span>
          </div>
        }

        {/* Wishlist heart — top-right of the image */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-sm transition-colors sm:h-8 sm:w-8 ${
            wishlisted ? 'text-brand-black hover:bg-white' : 'text-brand-black hover:bg-white'
          }`}>
          <Heart size={13} className="sm:hidden" fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={1.8} />
          <Heart size={15} className="hidden sm:block" fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={1.8} />
        </button>
      </div>

      {/* Info */}
      <div className="mt-3 px-1">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-brand-black">
          {product.name}
        </p>

        {/* Price row */}
        <div className="mt-2 flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
          {product.compareAtPrice &&
            <p className="text-xs text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</p>
          }
          <p className="text-sm font-medium text-brand-black">{formatPrice(product.price)}</p>
        </div>

        {/* Colors row — always full width below price so wrapping is clean */}
        <div
          className="mt-2 flex flex-wrap items-center gap-1.5"
          onClick={(e) => e.preventDefault()}>
          {visibleColors.map((color, i) =>
            <span
              key={`${color.name}-${i}`}
              title={color.name}
              className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
              style={{ backgroundColor: color.hex }} />
          )}
          {!expanded && overflow > 0 &&
            <button
              aria-label={`Show ${overflow} more colors`}
              onClick={(e) => { e.preventDefault(); setExpanded(true); }}
              className="text-[11px] font-medium text-gray-500 hover:text-brand-black transition-colors leading-none">
              +{overflow}
            </button>
          }
        </div>

        {/* Add to Bag */}
        <button
          aria-label="Add to bag"
          onClick={handleAddToCart}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-xs font-medium transition-colors duration-150 ${
            addedFeedback
              ? 'border-green-600 bg-green-600 text-white'
              : 'border-gray-200 text-brand-black hover:border-brand-black hover:bg-brand-black hover:text-white'
          }`}>
          <ShoppingBag size={13} />
          {addedFeedback ? 'Added!' : 'Add to Bag'}
        </button>
      </div>
    </Link>);

}