'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ProductImage } from '@/types'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = images[activeIndex] ?? images[0]

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      {/* Main image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100 lg:flex-1">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeIndex}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Image
              src={active.url}
              alt={active.alt || productName}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnail rail */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-y-auto lg:overflow-x-visible">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                'relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2',
                i === activeIndex
                  ? 'ring-2 ring-brand-black ring-offset-2'
                  : 'opacity-60 hover:opacity-100'
              )}
            >
              <Image
                src={img.url}
                alt={img.alt || `${productName} view ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
