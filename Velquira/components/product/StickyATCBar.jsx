'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

/* Slim editorial sticky bar — ivory ground, hairline gold top edge.
   Appears when the in-page CTA scrolls out of view. Preserves the
   visibility trigger contract (`visible` prop) used by ProductInfo. */
export function StickyATCBar({ visible, productName, color, price, imageUrl, onAddToCart }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!visible || !mounted) return null

  return createPortal(
    <div
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1050 }}
      className="border-t border-gold/30 bg-ivory/95 backdrop-blur-md"
    >
      <div
        className="mx-auto flex max-w-site items-center justify-between gap-4 px-4 md:px-6 lg:px-8"
        style={{ height: 72 }}
      >
        {/* LEFT — hairline gold thumb + serif name + price */}
        <div className="flex min-w-0 items-center gap-4">
          {imageUrl && (
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-gold/30 bg-cream">
              <img
                src={imageUrl}
                alt={productName}
                className="h-full w-full object-contain p-1"
              />
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-[15px] font-normal text-brand-black">
              {productName}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-[12px] text-brand-black/65">
              {color && <span className="truncate uppercase tracking-[0.2em] text-[10px] text-gold">{color}</span>}
              <span className="font-display text-[13px] text-brand-black/75">
                {formatPrice(price)}
              </span>
            </p>
          </div>
        </div>

        {/* RIGHT — gold-on-cocoa pill */}
        <button
          onClick={onAddToCart}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-transparent bg-brand-black px-6 py-3 text-[11px] font-medium uppercase tracking-[0.28em] text-white transition-colors hover:border-gold hover:bg-gold-deep md:px-8"
        >
          <ShoppingBag size={14} strokeWidth={1.6} />
          <span className="hidden sm:inline">Add to Bag</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </div>,
    document.body
  )
}