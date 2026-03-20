'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ColorSwatch } from './ColorSwatch'
import { formatPrice } from '@/lib/utils'
import type { Product, ProductColor } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [activeColor, setActiveColor] = useState<ProductColor>(
    product.colors[0] ?? { name: 'Default', hex: '#f2f0eb', imageIndex: 0 }
  )
  const [hovered, setHovered] = useState(false)

  const primaryImage = product.images[activeColor.imageIndex] ?? product.images[0]
  const hoverImage = product.images[1] ?? primaryImage

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-off-white p-3 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area — fixed aspect, consistent padding so every shoe sits the same */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-off-white p-4">
        <AnimatePresence initial={false}>
          <motion.div
            key={hovered ? 'hover' : 'primary'}
            className="absolute inset-0 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Image
              src={hovered ? hoverImage.url : primaryImage.url}
              alt={hovered ? hoverImage.alt : primaryImage.alt}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Badge top-left */}
        {product.badge && (
          <div className="absolute left-3 top-3">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-brand-black">
              {product.badge === 'New' ? 'New Color' : product.badge}
            </span>
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="mt-3 px-1">
        {/* Product name — uppercase bold */}
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-brand-black">
          {product.name}
        </p>
        {/* Active color name */}
        <p className="mt-0.5 text-sm text-gray-600">{activeColor.name}</p>

        {/* Bottom row: swatch + price */}
        <div
          className="mt-3 flex items-center justify-between"
          onClick={(e) => e.preventDefault()}
        >
          {/* Swatches */}
          <div
            role="radiogroup"
            aria-label={`Color options for ${product.name}`}
            className="flex gap-1.5"
          >
            {product.colors.slice(0, 4).map((color) => (
              <ColorSwatch
                key={color.name}
                color={color}
                active={activeColor.name === color.name}
                onSelect={setActiveColor}
              />
            ))}
          </div>

          {/* Price */}
          <div className="flex items-center gap-1.5">
            {product.compareAtPrice && (
              <p className="text-xs text-gray-400 line-through">
                {formatPrice(product.compareAtPrice)}
              </p>
            )}
            <p className="text-sm font-medium text-brand-black">{formatPrice(product.price)}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
