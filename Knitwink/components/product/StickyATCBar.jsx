'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export function StickyATCBar({ visible, productName, color, price, imageUrl, onAddToCart }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!visible || !mounted) return null

  return createPortal(
    <div
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1050 }}
      className="border-t border-gray-200 bg-white/95 backdrop-blur-md shadow-[0_-2px_16px_rgba(0,0,0,0.06)]"
    >
      <div className="mx-auto flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8" style={{ height: 100 }}>
        <div className="flex items-center gap-4 min-w-0">
          {imageUrl && (
            <img src={imageUrl} alt={productName} className="h-16 w-16 shrink-0 rounded-xl object-contain bg-gray-50" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-black">{productName}</p>
            <p className="mt-0.5 text-xs text-gray-500">{color} · {formatPrice(price)}</p>
          </div>
        </div>

        <button
          onClick={onAddToCart}
          className="flex shrink-0 items-center gap-2 rounded-full bg-brand-black px-7 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-80"
        >
          <ShoppingBag size={14} />
          Add to Bag
        </button>
      </div>
    </div>,
    document.body
  )
}
