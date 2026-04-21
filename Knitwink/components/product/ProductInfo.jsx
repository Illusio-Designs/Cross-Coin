'use client'

import { useState, useMemo } from 'react'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { useCart } from '@/hooks/useCart'
import { StickyATCBar } from './StickyATCBar'
import { formatPrice, cn } from '@/lib/utils'
import { Minus, Plus, ShoppingBag, Zap, Eye, TrendingUp, Star } from 'lucide-react'

function seedNum(id, min, max) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0
  return min + Math.abs(h) % (max - min + 1)
}

export function ProductInfo({ product, onColorChange }) {
  const [activeColor, setActiveColor] = useState(
    product.colors[0] ?? { name: 'Default', hex: '#f2f0eb', imageIndex: 0 }
  )
  const [qty, setQty] = useState(1)
  const [addedFeedback, setAddedFeedback] = useState(false)
  const { addItem, openDrawer } = useCart()
  const { ref: atcRef, isVisible: atcVisible } = useIntersectionObserver({ threshold: 0.5 })

  const stockLeft = useMemo(() => seedNum(product.id, 2, 6), [product.id])
  const viewing = useMemo(() => seedNum(product.id + 'v', 80, 220), [product.id])
  const sold = useMemo(() => seedNum(product.id + 's', 800, 3200), [product.id])

  const handleColorSelect = (color) => {
    setActiveColor(color)
    onColorChange?.(color)
  }

  const handleAddToCart = () => {
    const variant = product.variants.find(v => v.color === activeColor.name) || product.variants[0]
    const varImages = product.colorImages?.[activeColor.name] || []
    const imageUrl = varImages[0]?.url || product.images[0]?.url || ''
    addItem({
      id: variant?.id ?? product.id,
      productId: product.id,
      variantId: variant?.id ?? 'free-size',
      name: product.name,
      color: activeColor.name,
      size: 'Free Size',
      price: product.price,
      quantity: qty,
      imageUrl,
      handle: product.handle,
    })
    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 2000)
  }

  const handleBuyNow = () => {
    handleAddToCart()
    openDrawer()
  }

  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0

  return (
    <>
      {/* White card wrapper */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 lg:p-7">

        {/* Collection badge */}
        {product.collectionName && (
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {product.collectionName}
          </span>
        )}

        {/* Title */}
        <h1 className="mt-3 text-xl font-bold leading-snug text-brand-black lg:text-2xl">{product.name}</h1>

        {/* Rating + SKU row */}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-1 text-xs text-gray-400">(4.8)</span>
          </div>
          {product.sku && (
            <>
              <span className="text-gray-200">|</span>
              <span className="text-[10px] text-gray-400">SKU: {product.sku}</span>
            </>
          )}
        </div>

        {/* Divider */}
        <hr className="my-4 border-gray-100" />

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-brand-black">{formatPrice(product.price)}</span>
          {product.compareAtPrice && (
            <>
              <span className="text-sm text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</span>
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-500">
                {discount}% OFF
              </span>
            </>
          )}
        </div>
        <p className="mt-1 text-[10px] text-gray-500">MRP incl. of all taxes</p>

        {/* Social proof strip */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-500">
          <span className="flex items-center gap-1 font-medium text-red-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Only {stockLeft} left
          </span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-1"><Eye size={11} /> {viewing} viewing</span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-1">
            <TrendingUp size={11} />
            {sold >= 1000 ? `${(sold / 1000).toFixed(1)}k` : sold} sold
          </span>
        </div>

        {/* Divider */}
        <hr className="my-4 border-gray-100" />

        {/* Color selector */}
        {product.colors.length > 0 && product.colors[0].name && (
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-brand-black">
              Color <span className="normal-case font-normal text-gray-600">— {activeColor.name}</span>
            </p>
            <div role="radiogroup" aria-label="Select color" className="flex flex-wrap gap-2">
              {product.colors.map((color) =>
                color.packColors ? (
                  <button
                    key={color.name}
                    role="radio"
                    aria-checked={activeColor.name === color.name}
                    onClick={() => handleColorSelect(color)}
                    title={color.name}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border-2 px-2.5 py-2 transition-all',
                      activeColor.name === color.name ? 'border-brand-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                    )}
                  >
                    <div className="flex gap-1">
                      {color.packColors.map((pc) => (
                        <span key={pc.name} className="h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: pc.hex }} />
                      ))}
                    </div>
                    <span className="text-[9px] font-semibold text-gray-500">Pack of {color.packColors.length}</span>
                  </button>
                ) : (
                  <button
                    key={color.name}
                    role="radio"
                    aria-checked={activeColor.name === color.name}
                    onClick={() => handleColorSelect(color)}
                    title={color.name}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-all',
                      activeColor.name === color.name ? 'border-brand-black ring-2 ring-brand-black ring-offset-2' : 'border-gray-200 hover:border-gray-400'
                    )}
                    style={{ backgroundColor: color.hex }}
                  />
                )
              )}
            </div>
          </div>
        )}

        {/* Size */}
        <div className="mt-5">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-brand-black">Size</p>
          <button disabled className="cursor-default rounded-full border-2 border-brand-black bg-brand-black px-6 py-2 text-xs font-semibold uppercase tracking-wider text-white">
            Free Size
          </button>
        </div>

        {/* Divider */}
        <hr className="my-5 border-gray-100" />

        {/* Qty + Add to Bag + Buy Now */}
        <div ref={atcRef} className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-1 self-start rounded-full border border-gray-200 px-2.5 py-2.5 sm:self-auto">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease" className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100">
              <Minus size={12} />
            </button>
            <span className="w-5 text-center text-sm font-semibold">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} aria-label="Increase" className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100">
              <Plus size={12} />
            </button>
          </div>

          <div className="flex flex-1 items-center gap-2.5">
            <button
              onClick={handleAddToCart}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold uppercase tracking-wider transition-colors',
                addedFeedback ? 'bg-green-600 text-white' : 'bg-brand-black text-white hover:bg-gray-800'
              )}
            >
              <ShoppingBag size={14} />
              {addedFeedback ? 'Added!' : 'Add to Bag'}
            </button>

            <button
              onClick={handleBuyNow}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-brand-black py-[10px] text-xs font-semibold uppercase tracking-wider text-brand-black transition-colors hover:bg-brand-black hover:text-white"
            >
              <Zap size={14} />
              Buy Now
            </button>
          </div>
        </div>
      </div>

      <StickyATCBar
        visible={!atcVisible}
        productName={product.name}
        color={activeColor.name}
        price={product.price}
        imageUrl={
          (product.colorImages?.[activeColor.name]?.[0]?.url) ||
          (product.images?.[0]?.url) ||
          ''
        }
        onAddToCart={handleAddToCart}
      />
    </>
  )
}
