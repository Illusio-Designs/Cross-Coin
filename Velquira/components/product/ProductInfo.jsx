'use client'

import { useState, useMemo, useEffect } from 'react'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { useCart } from '@/hooks/useCart'
import { useWishlistStore } from '@/store/wishlistStore'
import { StickyATCBar } from './StickyATCBar'
import { formatPrice, cn } from '@/lib/utils'
import { getProductReviews } from '@/lib/api/reviews'
import { Star, Heart, Minus, Plus, ChevronDown } from 'lucide-react'

function seedNum(id, min, max) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0
  return min + Math.abs(h) % (max - min + 1)
}

/* Hairline accordion row — no boxes, only a top divider. */
function AccordionRow({ title, children, open, onToggle }) {
  return (
    <div className="border-t border-line">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink">
          {title}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.4}
          className={cn(
            'shrink-0 text-text-muted transition-transform duration-300',
            open && 'rotate-180 text-gold'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-500 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-6 text-[14px] leading-[1.8] text-text-muted">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductInfo({ product, onColorChange }) {
  const [activeColor, setActiveColor] = useState(
    product.colors[0] ?? { name: 'Default', hex: '#f2f0eb', imageIndex: 0 }
  )
  const [addedFeedback, setAddedFeedback] = useState(false)
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 })
  const [quantity, setQuantity] = useState(1)
  const [openPanel, setOpenPanel] = useState('description')

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
      quantity,
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
    'Velquira'

  const savePercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0

  const TRUST = [
    'Free Insured Shipping',
    'Hallmarked 18k Gold',
    'Lifetime Care',
  ]

  return (
    <>
      <div className="relative flex flex-col">

        {/* 1 — Collection eyebrow */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">
          {collectionEyebrow}
        </p>

        {/* 2 — Title */}
        <h1 className="vq-display mt-4 text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[1.06] tracking-[-0.02em] text-ink">
          {product.name}
        </h1>

        {/* 3 — Star row (only when there are reviews) */}
        {reviewStats.count > 0 && reviewStats.average > 0 && (
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
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
            <span className="ml-1 text-[12px] text-text-muted">
              {reviewStats.average.toFixed(1)} · {reviewStats.count} {reviewStats.count === 1 ? 'review' : 'reviews'}
            </span>
          </div>
        )}

        {/* 4 — Price row */}
        <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span className="vq-display text-[clamp(1.6rem,2.4vw,2.1rem)] text-gold">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="vq-display text-[16px] text-text-faint line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
          {savePercent > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
              Save {savePercent}%
            </span>
          )}
        </div>

        {/* 5 — Short description */}
        {product.description && (
          <p className="mt-5 text-[14px] leading-[1.85] text-text-muted line-clamp-4">
            {product.description}
          </p>
        )}

        {/* Hairline divider */}
        <span className="mt-8 block h-px w-full bg-line" aria-hidden />

        {/* 6 — Colour / finish selector */}
        {product.colors.length > 0 && product.colors[0].name && (
          <div className="mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-text-muted">
              Finish
              <span className="ml-3 text-[12px] normal-case tracking-normal text-ink">
                {activeColor.name}
              </span>
            </p>
            <div role="radiogroup" aria-label="Select finish" className="mt-4 flex flex-wrap items-center gap-3">
              {product.colors.map((color) =>
                color.packColors ? (
                  <button
                    key={color.name}
                    role="radio"
                    aria-checked={activeColor.name === color.name}
                    onClick={() => handleColorSelect(color)}
                    title={color.name}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] transition-all duration-300',
                      activeColor.name === color.name
                        ? 'border-ink bg-ink text-cream'
                        : 'border-line text-text-muted hover:border-ink hover:text-ink'
                    )}
                  >
                    <span className="flex gap-1">
                      {color.packColors.map((pc) => (
                        <span key={pc.name} className="h-3 w-3 rounded-full" style={{ backgroundColor: pc.hex }} />
                      ))}
                    </span>
                    <span>Set of {color.packColors.length}</span>
                  </button>
                ) : (
                  <button
                    key={color.name}
                    role="radio"
                    aria-checked={activeColor.name === color.name}
                    onClick={() => handleColorSelect(color)}
                    title={color.name}
                    aria-label={color.name}
                    className={cn(
                      'relative h-8 w-8 rounded-full transition-all duration-300',
                      activeColor.name === color.name
                        ? 'ring-1 ring-ink ring-offset-4 ring-offset-cream'
                        : 'ring-1 ring-line hover:ring-text-muted'
                    )}
                  >
                    <span
                      className="absolute inset-[3px] rounded-full"
                      style={{ backgroundColor: color.hex }}
                    />
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Size pills — only when the data carries sizes */}
        {Array.isArray(product.sizes) && product.sizes.length > 0 && (
          <div className="mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-text-muted">Size</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {product.sizes.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-line px-5 py-2 text-[11px] uppercase tracking-[0.12em] text-text-muted"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 7 — Quantity + stock note */}
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-text-muted">Quantity</p>
            <div className="mt-4 inline-flex items-center rounded-full border border-line">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="flex h-11 w-11 items-center justify-center text-text-muted transition-colors hover:text-ink"
              >
                <Minus size={14} strokeWidth={1.6} />
              </button>
              <span className="min-w-[2.5rem] text-center text-[13px] tabular-nums text-ink">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                className="flex h-11 w-11 items-center justify-center text-text-muted transition-colors hover:text-ink"
              >
                <Plus size={14} strokeWidth={1.6} />
              </button>
            </div>
          </div>

          {stockLeft <= 3 && (
            <p className="vq-display mt-8 text-[13px] italic text-text-muted">
              Only {stockLeft} left — made to order
            </p>
          )}
        </div>

        {/* 8 — Add to Bag + wishlist link */}
        <div ref={atcRef} className="mt-8">
          <button
            onClick={handleAddToCart}
            className={cn(
              'w-full rounded-full bg-[#1e1912] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-black',
              addedFeedback && 'bg-black'
            )}
          >
            {addedFeedback ? 'Added to Bag' : 'Add to Bag'}
          </button>

          <button
            onClick={handleWishlist}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={cn(
              'mx-auto mt-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] transition-colors',
              wishlisted ? 'text-gold' : 'text-text-muted hover:text-ink'
            )}
          >
            <Heart size={13} strokeWidth={1.6} fill={wishlisted ? 'currentColor' : 'none'} />
            {wishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}
          </button>
        </div>

        {/* 9 — Trust row — hairline separated, no boxes */}
        <div className="mt-10 grid grid-cols-1 border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-line">
          {TRUST.map((item) => (
            <div
              key={item}
              className="flex items-center justify-center gap-2 px-3 py-4 text-center"
            >
              <span className="vq-diamond shrink-0" aria-hidden />
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {item}
              </span>
            </div>
          ))}
        </div>

        {/* 10 — Accordion */}
        <div className="mt-10">
          <AccordionRow
            title="Description"
            open={openPanel === 'description'}
            onToggle={() => setOpenPanel(openPanel === 'description' ? null : 'description')}
          >
            <p>
              {product.description ||
                `${product.name} is finished by hand in our studio and checked piece by piece before it ships. A Certificate of Authenticity is included in the box.`}
            </p>
          </AccordionRow>

          <AccordionRow
            title="Materials & Care"
            open={openPanel === 'materials'}
            onToggle={() => setOpenPanel(openPanel === 'materials' ? null : 'materials')}
          >
            <ul className="space-y-2">
              <li>Hallmarked 18k gold with ethically sourced stones.</li>
              <li>Wipe with the soft cloth provided after each wear.</li>
              <li>Keep away from perfume, lotion and chlorine.</li>
              <li>Store in the pouch it arrives in to avoid scratches.</li>
            </ul>
          </AccordionRow>

          <AccordionRow
            title="Shipping & Returns"
            open={openPanel === 'shipping'}
            onToggle={() => setOpenPanel(openPanel === 'shipping' ? null : 'shipping')}
          >
            <ul className="space-y-2">
              <li>Free insured shipping on every order.</li>
              <li>Dispatched in 2–4 working days; custom orders take longer.</li>
              <li>Easy 7-day returns on unworn items in original packaging.</li>
              <li>Lifetime cleaning and repair support from our studio.</li>
            </ul>
          </AccordionRow>

          <span className="block h-px w-full bg-line" aria-hidden />
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
