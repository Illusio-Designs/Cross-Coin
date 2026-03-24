'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface StickyATCBarProps {
  visible: boolean
  productName: string
  color: string
  price: number
  selectedSize: string | null
  onAddToCart: () => void
  disabled?: boolean
}

export function StickyATCBar({
  visible,
  productName,
  color,
  price,
  selectedSize,
  onAddToCart,
  disabled,
}: StickyATCBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-gray-200 bg-white"
          initial={{ y: 64 }}
          animate={{ y: 0 }}
          exit={{ y: 64 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className="mx-auto flex h-full max-w-site items-center justify-between gap-4 px-5 lg:px-8">
            {/* Product info */}
            <div className="hidden flex-col sm:flex">
              <p className="text-sm font-medium text-brand-black">{productName}</p>
              <p className="text-xs text-gray-600">{color} · {formatPrice(price)}</p>
            </div>

            <div className="flex flex-1 items-center justify-end gap-3 sm:flex-none">
              {/* Size pill */}
              <div className="rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-600">
                {selectedSize ? `Size ${selectedSize}` : 'Select size'}
              </div>

              {/* ATC button */}
              <button
                onClick={onAddToCart}
                disabled={disabled || !selectedSize}
                className={cn(
                  'rounded-full px-6 py-2.5 text-sm font-medium uppercase tracking-wider text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage',
                  disabled || !selectedSize
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-sage hover:bg-sage-dark'
                )}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
