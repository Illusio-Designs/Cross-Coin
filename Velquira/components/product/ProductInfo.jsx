'use client'

import { useState, useMemo, useEffect } from 'react'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { useCart } from '@/hooks/useCart'
import { useWishlistStore } from '@/store/wishlistStore'
import { StickyATCBar } from './StickyATCBar'
import { formatPrice, cn } from '@/lib/utils'
import { getProductReviews } from '@/lib/api/reviews'
import { ShoppingBag, Star, Heart } from 'lucide-react'

function seedNum(id, min, max) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0
  return min + Math.abs(h) % (max - min + 1)
}

export function ProductInfo({ product, onColorChange }) {
  const [activeColor, setActiveColor] = useState(
    product.colors[0] ?? { name: 'Default', hex: '#f2f0eb', imageIndex: 0 }
  )
  const [addedFeedback, setAddedFeedback] = useState(false)
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 })

  /* Pull real review data so the rating row reflects actual customer
     reviews instead of a hardcoded score. */
  useEffect(() => {
    let active = true
    getProductReviews(product.id)
      .then((data) => {
        if (!active) return
        const list = data?.reviews ?? data ?? []
        const average =
          data?.stats?.average ??
          (list.length
            ? list.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / list.length
            : 0)
        const count = data?.stats?.total ?? list.length
        setReviewStats({ average: Number(average) || 0, count })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [product.id])

  const { addItem } = useCart()
  const wishlisted = useWishlistStore((s) => s.hasItem(product.id))
  const toggleWishlist = useWishlistStore((s) => s.toggle)
  const updateWishlistItem = useWishlistStore((s) => s.updateItem)

  /* Build a wishlist payload that captures the variation the customer is
     looking at right now (active finish + matching variant). */
  const buildWishlistEntry = () => {
    const variant = product.variants?.find((v) => v.color === activeColor.name) || product.variants?.[0]
    const colorImages = product.colorImages?.[activeColor.name] || []
    const imageUrl = colorImages[0]?.url || product.images?.[0]?.url || ''
    return {
      ...product,
      selectedColor: activeColor.name,
      selectedColorHex: activeColor.hex,
      selectedVariantId: variant?.id ?? null,
      selectedImageUrl: imageUrl,
      price: product.price,
    }
  }

  const handleWishlist = () => {
    toggleWishlist(buildWishlistEntry())
  }

  const onActiveColorChanged = (color) => {
    if (wishlisted && updateWishlistItem) {
      const variant = product.variants?.find((v) => v.color === color.name) || product.variants?.[0]
      const colorImages = product.colorImages?.[color.name] || []
      updateWishlistItem(product.id, {
        selectedColor: color.name,
        selectedColorHex: color.hex,
        selectedVariantId: variant?.id ?? null,
        selectedImageUrl: colorImages[0]?.url || product.images?.[0]?.url || '',
      })
    }
  }
  const { ref: atcRef, isVisible: atcVisible } = useIntersectionObserver({ threshold: 0.5 })

  const stockLeft = useMemo(() => seedNum(product.id, 2, 6), [product.id])

  const handleColorSelect = (color) => {
    setActiveColor(color)
    onColorChange?.(color)
    onActiveColorChanged(color)
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
      quantity: 1,
      imageUrl,
      handle: product.handle,
    })
    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 2000)
  }

  const collectionEyebrow =
    product.collection ||
    product.collectionName ||
    product.category ||
    product.categories?.[0]?.name ||
    'Velquira Atelier'

  return (
    <>
      <div className="relative flex flex-col py-2 space-y-7">

        {/* 1 — Collection eyebrow */}
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
          {collectionEyebrow}
        </p>

        {/* 2 — Title (Playfair big) */}
        <h1 className="font-display text-4xl font-normal leading-[1.05] text-brand-black md:text-5xl">
          {product.name}
        </h1>

        {/* 3 — Star row (only when there are reviews) */}
        {reviewStats.count > 0 && reviewStats.average > 0 && (
          <div className="flex items-center gap-2 -mt-2">
            {[1,2,3,4,5].map(i => (
              <Star
                key={i}
                size={13}
                strokeWidth={1.4}
                className={
                  i <= Math.round(reviewStats.average)
                    ? 'fill-gold text-gold'
                    : 'fill-transparent text-gold/30'
                }
              />
            ))}
            <span className="ml-1 text-[12px] text-brand-black/55">
              {reviewStats.average.toFixed(1)} · {reviewStats.count} {reviewStats.count === 1 ? 'review' : 'reviews'}
            </span>
          </div>
        )}

        {/* 4 — Price (serif) */}
        <div className="flex items-baseline gap-4">
          <span className="font-display text-3xl text-brand-black">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="font-display text-base text-brand-black/40 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* 5 — Short refined description (clamp 4) */}
        {product.description && (
          <p className="text-[14px] leading-relaxed text-brand-black/70 line-clamp-4">
            {product.description}
          </p>
        )}

        {/* Thin gold rule */}
        <span className="block h-px w-12 bg-gold/60" aria-hidden />

        {/* 6 — Variant selectors (Finish / Colour) */}
        {product.colors.length > 0 && product.colors[0].name && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
              Finish
              <span className="ml-3 text-[12px] normal-case tracking-normal text-brand-black/65">
                — {activeColor.name}
              </span>
            </p>
            <div role="radiogroup" aria-label="Select finish" className="mt-4 flex flex-wrap gap-2.5">
              {product.colors.map((color) =>
                color.packColors ? (
                  <button
                    key={color.name}
                    role="radio"
                    aria-checked={activeColor.name === color.name}
                    onClick={() => handleColorSelect(color)}
                    title={color.name}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-4 py-2 transition-all',
                      activeColor.name === color.name
                        ? 'border-gold ring-1 ring-gold ring-offset-2 ring-offset-ivory bg-cream'
                        : 'border-gold/40 bg-transparent hover:border-gold'
                    )}
                  >
                    <span className="flex gap-1">
                      {color.packColors.map((pc) => (
                        <span key={pc.name} className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: pc.hex }} />
                      ))}
                    </span>
                    <span className="text-[12px] text-brand-black/75">
                      Set of {color.packColors.length}
                    </span>
                  </button>
                ) : (
                  <button
                    key={color.name}
                    role="radio"
                    aria-checked={activeColor.name === color.name}
                    onClick={() => handleColorSelect(color)}
                    title={color.name}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-4 py-2 transition-all',
                      activeColor.name === color.name
                        ? 'border-gold ring-1 ring-gold ring-offset-2 ring-offset-ivory bg-cream'
                        : 'border-gold/40 bg-transparent hover:border-gold'
                    )}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-gold/30"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-[12px] text-brand-black/75">
                      {color.name}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Render size variants if data carries them — same hairline pill style */}
        {Array.isArray(product.sizes) && product.sizes.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Size</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {product.sizes.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-gold/40 px-4 py-2 text-[12px] text-brand-black/75"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 7 — Quiet stock note (only when ≤ 3) */}
        {stockLeft <= 3 && (
          <p className="font-display italic text-[13px] text-gold">
            Only {stockLeft} crafted to order
          </p>
        )}

        {/* 8 — CTA row */}
        <div ref={atcRef} className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
          <button
            onClick={handleAddToCart}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-transparent bg-brand-black px-8 py-4 text-[11px] font-medium uppercase tracking-[0.28em] text-white transition-colors hover:border-gold hover:bg-gold-deep',
              addedFeedback && 'border-gold bg-gold-deep'
            )}
          >
            <ShoppingBag size={14} strokeWidth={1.6} />
            {addedFeedback ? 'Added to Bag' : 'Add to Bag'}
          </button>

          <button
            onClick={handleWishlist}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-full border px-7 py-[15px] text-[11px] font-medium uppercase tracking-[0.28em] transition-colors',
              wishlisted
                ? 'border-gold bg-gold/10 text-gold-deep'
                : 'border-gold/50 text-gold hover:border-gold hover:bg-gold/5'
            )}
          >
            <Heart size={13} strokeWidth={1.6} fill={wishlisted ? 'currentColor' : 'none'} />
            {wishlisted ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* 9 — Single assurance line in italic gold serif */}
        <p className="font-display italic text-[13px] text-gold">
          Certificate of Authenticity included with every piece.
        </p>

        {/* 10 — Atelier mini-list (gold dots) */}
        <ul className="space-y-2 pt-1">
          {[
            'Hand-finished in Bandra',
            'Hallmarked 18k',
            'Lifetime craftsmanship guarantee',
          ].map((line) => (
            <li key={line} className="flex items-start gap-3 text-[13px] text-brand-black/70">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
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