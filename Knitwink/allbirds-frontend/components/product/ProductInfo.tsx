'use client'

import { useState, useRef } from 'react'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { useCart } from '@/hooks/useCart'
import { StickyATCBar } from './StickyATCBar'
import { CarbonBadge } from './CarbonBadge'
import { SizeGuide } from './SizeGuide'
import { formatPrice, cn } from '@/lib/utils'
import { Leaf, Wind, Droplets, Zap } from 'lucide-react'
import type { Product, ProductColor, ProductVariant } from '@/types'

const FEATURE_ICONS = [
  { icon: <Leaf size={24} className="text-sage" />, label: 'Natural' },
  { icon: <Wind size={24} className="text-sage" />, label: 'Breathable' },
  { icon: <Droplets size={24} className="text-sage" />, label: 'Moisture-Wicking' },
  { icon: <Zap size={24} className="text-sage" />, label: 'Lightweight' },
]

interface ProductInfoProps {
  product: Product
  onColorChange?: (color: ProductColor) => void
}

export function ProductInfo({ product, onColorChange }: ProductInfoProps) {
  const [activeColor, setActiveColor] = useState<ProductColor>(product.colors[0] ?? { name: 'Default', hex: '#f2f0eb', imageIndex: 0 })
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [addedFeedback, setAddedFeedback] = useState(false)
  const { addItem } = useCart()

  // Watch the main ATC button to show/hide sticky bar
  const { ref: atcRef, isVisible: atcVisible } = useIntersectionObserver({ threshold: 0.5 })

  // Unique sizes from variants
  const sizes = Array.from(new Set(product.variants.map((v) => v.size)))

  // Check stock for a given size
  const isOutOfStock = (size: string) => {
    const variant = product.variants.find(
      (v) => v.size === size && v.color === activeColor.name
    )
    return variant ? variant.stock === 0 : false
  }

  const handleColorSelect = (color: ProductColor) => {
    setActiveColor(color)
    onColorChange?.(color)
  }

  const handleAddToCart = () => {
    if (!selectedSize) return
    const variant = product.variants.find(
      (v) => v.size === selectedSize && v.color === activeColor.name
    ) ?? product.variants[0]

    addItem({
      id: variant?.id ?? `${product.id}-${selectedSize}`,
      productId: product.id,
      variantId: variant?.id ?? selectedSize,
      name: product.name,
      color: activeColor.name,
      size: selectedSize,
      price: product.price,
      quantity: 1,
      imageUrl: product.images[activeColor.imageIndex]?.url ?? product.images[0]?.url ?? '',
      handle: product.handle,
    })

    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 2000)
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Collection + name */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-600">
            {product.collectionName}
          </p>
          <h1 className="mt-1 font-display text-3xl font-normal text-brand-black">
            {product.name}
          </h1>
        </div>

        {/* Price */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium text-brand-black">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-base text-gray-400 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* Color selector */}
        {product.colors.length > 0 && (
          <div>
            <p className="mb-2.5 text-xs font-medium uppercase tracking-widest text-gray-600">
              Color — <span className="normal-case font-normal text-brand-black">{activeColor.name}</span>
            </p>
            <div
              role="radiogroup"
              aria-label="Select color"
              className="flex flex-wrap gap-2"
            >
              {product.colors.map((color) => (
                <button
                  key={color.name}
                  role="radio"
                  aria-label={color.name}
                  aria-checked={activeColor.name === color.name}
                  onClick={() => handleColorSelect(color)}
                  className={cn(
                    'h-6 w-6 rounded-full border border-gray-200 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage',
                    activeColor.name === color.name && 'ring-2 ring-sage ring-offset-2'
                  )}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Size selector */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-600">
              Size {selectedSize && <span className="normal-case font-normal text-brand-black">— {selectedSize}</span>}
            </p>
            <SizeGuide gender={product.collectionName.toLowerCase().includes('women') ? 'womens' : 'mens'} />
          </div>
          <div
            role="group"
            aria-label="Select size"
            className="flex flex-wrap gap-2"
          >
            {(sizes.length > 0 ? sizes : ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11']).map((size) => {
              const oos = isOutOfStock(size)
              return (
                <button
                  key={size}
                  aria-pressed={selectedSize === size}
                  disabled={oos}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2',
                    oos && 'cursor-not-allowed opacity-40',
                    selectedSize === size
                      ? 'border-brand-black bg-brand-black text-white'
                      : 'border-gray-200 text-gray-800 hover:border-brand-black'
                  )}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>

        {/* Add to Cart */}
        <button
          ref={atcRef as React.RefObject<HTMLButtonElement>}
          onClick={handleAddToCart}
          disabled={!selectedSize}
          className={cn(
            'w-full rounded-full py-4 text-sm font-medium uppercase tracking-wider text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage',
            !selectedSize
              ? 'cursor-not-allowed bg-gray-400'
              : addedFeedback
              ? 'bg-success'
              : 'bg-sage hover:bg-sage-dark'
          )}
        >
          {addedFeedback ? 'Added!' : !selectedSize ? 'Select a Size' : 'Add to Cart'}
        </button>

        {/* Carbon badge */}
        <CarbonBadge kg={product.carbonFootprint} />

        {/* Description */}
        {product.description && (
          <p className="text-base leading-relaxed text-gray-600">{product.description}</p>
        )}

        {/* Feature icons row */}
        <div className="grid grid-cols-4 gap-2 border-t border-gray-200 pt-5">
          {FEATURE_ICONS.map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-1.5 text-center">
              {f.icon}
              <span className="text-xs font-medium uppercase tracking-widest text-gray-600">
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky ATC bar */}
      <StickyATCBar
        visible={!atcVisible}
        productName={product.name}
        color={activeColor.name}
        price={product.price}
        selectedSize={selectedSize}
        onAddToCart={handleAddToCart}
      />
    </>
  )
}
