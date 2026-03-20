'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ColorSwatch } from './ColorSwatch'
import { Badge } from '@/components/ui/Badge'
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
      className="group flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image container */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gray-100 transition-transform duration-150 group-hover:-translate-y-0.5 md:aspect-[3/4]">
        {/* Primary image */}
        <AnimatePresence initial={false}>
          <motion.div
            key={hovered ? 'hover' : 'primary'}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Image
              src={hovered ? hoverImage.url : primaryImage.url}
              alt={hovered ? hoverImage.alt : primaryImage.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </motion.div>
        </AnimatePresence>

        {/* Badge */}
        {product.badge && (
          <div className="absolute left-3 top-3">
            <Badge variant={product.badge} />
          </div>
        )}
      </div>

      {/* Swatches */}
      {product.colors.length > 0 && (
        <div
          role="radiogroup"
          aria-label={`Color options for ${product.name}`}
          className="flex gap-1.5"
          onClick={(e) => e.preventDefault()}
        >
          {product.colors.map((color) => (
            <ColorSwatch
              key={color.name}
              color={color}
              active={activeColor.name === color.name}
              onSelect={setActiveColor}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="flex flex-col gap-0.5">
        <p className="truncate text-sm text-gray-800">{product.name}</p>
        <p className="text-xs text-gray-600">
          {product.colors.length > 1 ? `${product.colors.length} colors` : activeColor.name}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-brand-black">{formatPrice(product.price)}</p>
          {product.compareAtPrice && (
            <p className="text-sm text-gray-400 line-through">
              {formatPrice(product.compareAtPrice)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
