'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/utils'

/* Slim sticky bar — cream/blur ground, hairline top edge.
   Appears when the in-page CTA scrolls out of view. Preserves the
   visibility trigger contract (`visible` prop) used by ProductInfo. */
export function StickyATCBar({ visible, productName, color, price, imageUrl, onAddToCart }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!visible || !mounted) return null

  return createPortal(
    <div
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1050 }}
      className="border-t border-line bg-cream/90 backdrop-blur-xl"
    >
      <div className="vq-container flex items-center justify-between gap-6 py-3.5">
        {/* LEFT — thumb + name + price */}
        <div className="flex min-w-0 items-center gap-4">
          {imageUrl && (
            <div className="hidden h-12 w-12 shrink-0 overflow-hidden bg-paper sm:block">
              <img
                src={imageUrl}
                alt={productName}
                className="h-full w-full object-contain p-1"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="vq-display truncate text-[16px] leading-tight text-ink">
              {productName}
            </p>
            <p className="mt-1 flex items-center gap-3 leading-none">
              <span className="vq-display text-[14px] text-gold">
                {formatPrice(price)}
              </span>
              {color && (
                <>
                  <span className="h-3 w-px bg-line" aria-hidden />
                  <span className="truncate text-[9px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                    {color}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* RIGHT — black pill */}
        <button
          onClick={onAddToCart}
          className="shrink-0 rounded-full bg-[#1e1912] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-black"
        >
          <span className="hidden sm:inline">Add to Bag</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </div>,
    document.body
  )
}
