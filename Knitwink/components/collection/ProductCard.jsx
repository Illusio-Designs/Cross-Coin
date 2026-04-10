'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/lib/utils';


const MAX_DOTS = 5;





export function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const primaryImage = product.images[0];
  const hoverImage = product.images[1] ?? primaryImage;

  const overflow = product.colors.length - MAX_DOTS;
  const visibleColors = expanded ? product.colors : product.colors.slice(0, MAX_DOTS);

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
        <div className="absolute left-3 top-3">
            <span className="rounded-full bg-brand-black px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-white">
              {product.badge}
            </span>
          </div>
        }
      </div>

      {/* Info */}
      <div className="mt-3 px-1">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-brand-black">
          {product.name}
        </p>

        {/* Dots + price row */}
        <div
          className="mt-2 flex items-start justify-between gap-2"
          onClick={(e) => e.preventDefault()}>
          
          {/* Dots — wrap inline, +N continues in same flow */}
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleColors.map((color) =>
            <span
              key={color.name}
              title={color.name}
              className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
              style={{ backgroundColor: color.hex }} />

            )}
            {!expanded && overflow > 0 &&
            <button
              aria-label={`Show ${overflow} more colors`}
              onClick={(e) => {e.preventDefault();setExpanded(true);}}
              className="text-[11px] font-medium text-gray-500 hover:text-brand-black transition-colors leading-none">
              
                +{overflow}
              </button>
            }
          </div>

          {/* Price — anchored to the right, never wraps */}
          <div className="flex shrink-0 items-center gap-1.5">
            {product.compareAtPrice &&
            <p className="text-xs text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</p>
            }
            <p className="text-sm font-medium text-brand-black">{formatPrice(product.price)}</p>
          </div>
        </div>

        {/* Add to Bag */}
        <button
          aria-label="Add to bag"
          onClick={(e) => e.preventDefault()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-xs font-medium text-brand-black transition-colors duration-150 hover:border-brand-black hover:bg-brand-black hover:text-white">
          
          <ShoppingBag size={13} />
          Add to Bag
        </button>
      </div>
    </Link>);

}