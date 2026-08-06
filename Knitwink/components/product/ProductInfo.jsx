'use client'

import { useState, useMemo, useEffect } from 'react'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { useCart } from '@/hooks/useCart'
import { useWishlistStore } from '@/store/wishlistStore'
import { StickyATCBar } from './StickyATCBar'
import { formatPrice, cn } from '@/lib/utils'
import { getProductReviews } from '@/lib/api/reviews'
import { checkServiceability } from '@/lib/api/serviceability'
import { Minus, Plus, ShoppingBag, Zap, Star, Heart, Truck, AlertTriangle, Check, X, Lock, CreditCard, RotateCcw, ShieldCheck } from 'lucide-react'

export function ProductInfo({ product, onColorChange }) {
  const [activeColor, setActiveColor] = useState(
    product.colors[0] ?? { name: 'Default', hex: '#f2f0eb', imageIndex: 0 }
  )
  /* Which pack size the customer is currently browsing. A plain single
     colour counts as "Pack of 1"; a multi-colour combo is "Pack of N"
     (N = number of colours in the pack). Default to whatever the initially
     active colour belongs to. */
  const [activePack, setActivePack] = useState(
    product.colors[0]?.packColors?.length || 1
  )
  const [qty, setQty] = useState(1)
  const [addedFeedback, setAddedFeedback] = useState(false)
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 })

  // Delivery / pincode serviceability check.
  const [pincode, setPincode] = useState('')
  const [serviceability, setServiceability] = useState(null)
  const [checkingPin, setCheckingPin] = useState(false)
  const handlePincodeCheck = async () => {
    if (!/^\d{6}$/.test(pincode)) { setServiceability({ error: 'Enter a valid 6-digit pincode.' }); return }
    setCheckingPin(true)
    setServiceability(null)
    try { setServiceability(await checkServiceability(pincode)) }
    catch { setServiceability({ error: 'Unable to check. Please try again.' }) }
    finally { setCheckingPin(false) }
  }
  const eta = (() => {
    const days = (serviceability?.serviceable && serviceability?.estimated_delivery_days) || 5
    const d = new Date()
    d.setDate(d.getDate() + days)
    const day = d.getDate()
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'
    return { day, suffix, month: d.toLocaleString('en-IN', { month: 'long' }) }
  })()

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
  const { addItem, openDrawer } = useCart()
  const wishlisted = useWishlistStore((s) => s.hasItem(product.id))
  const toggleWishlist = useWishlistStore((s) => s.toggle)
  const updateWishlistItem = useWishlistStore((s) => s.updateItem)

  /* Build a wishlist payload that captures the variation the customer is
     looking at right now (active color + matching variant), so the
     /wishlist page can render exactly that combo and "Add to Cart" picks
     the right SKU. We re-resolve on every click in case the user changes
     the colour while the item is already saved (we patch the stored row). */
  const buildWishlistEntry = () => {
    const variant = activeVariant
    const colorImages = product.colorImages?.[activeColor.name] || []
    const imageUrl = colorImages[0]?.url || product.images?.[0]?.url || ''
    return {
      ...product,
      // Persist what was picked at save time
      selectedColor: activeColor.name,
      selectedColorHex: activeColor.hex,
      selectedVariantId: variant?.id ?? null,
      selectedImageUrl: imageUrl,
      price: variant?.price ?? product.price,
    }
  }

  const handleWishlist = () => {
    if (wishlisted) {
      // Clicking heart again on a saved product → also patch the stored
      // colour to the current selection before letting toggle remove it.
      // (No-op on remove path — toggle handles the rest.)
      toggleWishlist(buildWishlistEntry())
    } else {
      toggleWishlist(buildWishlistEntry())
    }
  }

  /* If the product is already saved and the user changes colour, update
     the stored row so the wishlist reflects the latest pick. */
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

  /* Resolve the variant matching the currently selected colour so the
     price + SKU + compareAtPrice all reflect that variation, not the
     product-level defaults (which only mirror the first variation). */
  const activeVariant = useMemo(
    () =>
      product.variants?.find((v) => v.color === activeColor.name) ||
      product.variants?.[0],
    [product.variants, activeColor.name]
  )
  const activePrice = activeVariant?.price ?? product.price
  const activeCompareAtPrice = activeVariant?.comparePrice ?? product.compareAtPrice
  const activeSku = activeVariant?.sku || product.sku

  const handleColorSelect = (color) => {
    setActiveColor(color)
    onColorChange?.(color)
    onActiveColorChanged(color)
  }

  /* Group every colour variation by its pack size so the UI can show a
     compact "Pack of 1 / Pack of 3 / Pack of 6" tab row instead of dumping
     every combo into one long, messy grid. Returns sorted entries:
     [ [1, [...singles]], [3, [...combos]], [6, [...combos]] ]. */
  const packGroups = useMemo(() => {
    const groups = new Map()
    product.colors.forEach((c) => {
      if (!c.name) return
      const size = c.packColors?.length || 1
      if (!groups.has(size)) groups.set(size, [])
      groups.get(size).push(c)
    })
    return [...groups.entries()].sort((a, b) => a[0] - b[0])
  }, [product.colors])

  /* The colour options belonging to the pack size the customer picked. */
  const visibleColorOptions = useMemo(
    () => packGroups.find(([size]) => size === activePack)?.[1] ?? [],
    [packGroups, activePack]
  )

  /* Switching pack size moves the selection to the first option of that
     pack so price/SKU/images stay in sync with a valid variation. */
  const handlePackSelect = (size) => {
    setActivePack(size)
    const first = packGroups.find(([s]) => s === size)?.[1]?.[0]
    if (first) handleColorSelect(first)
  }

  const handleAddToCart = () => {
    const variant = activeVariant
    const varImages = product.colorImages?.[activeColor.name] || []
    const imageUrl = varImages[0]?.url || product.images[0]?.url || ''
    addItem({
      id: variant?.id ?? product.id,
      productId: product.id,
      variantId: variant?.id ?? 'free-size',
      name: product.name,
      color: activeColor.name,
      size: 'Free Size',
      price: activePrice,
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

  const discount = activeCompareAtPrice
    ? Math.round((1 - activePrice / activeCompareAtPrice) * 100)
    : 0

  return (
    <>
      {/* White card wrapper */}
      <div className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 lg:p-7">

        {/* Wishlist heart — top-right of the info card */}
        <button
          onClick={handleWishlist}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={cn(
            'absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
            wishlisted
              ? 'border-brand-black bg-brand-black text-white hover:bg-gray-800'
              : 'border-gray-200 bg-white text-brand-black hover:border-brand-black hover:bg-gray-50'
          )}
        >
          <Heart size={17} fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={1.8} />
        </button>

        {/* Collection badge */}
        {product.collectionName && (
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {product.collectionName}
          </span>
        )}

        {/* Title — leave room on the right so it doesn't run into the heart */}
        <h1 className="mt-3 pr-12 text-xl font-bold leading-snug text-brand-black lg:text-2xl">{product.name}</h1>

        {/* Rating + SKU row */}
        <div className="mt-2 flex items-center gap-3">
          {reviewStats.count > 0 ? (
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <Star
                  key={i}
                  size={12}
                  className={
                    i <= Math.round(reviewStats.average)
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-gray-200 text-gray-200'
                  }
                />
              ))}
              <span className="ml-1 text-xs text-gray-400">
                {reviewStats.average.toFixed(1)} ({reviewStats.count})
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">No reviews yet</span>
          )}
          {activeSku && (
            <>
              <span className="text-gray-200">|</span>
              <span className="text-[10px] text-gray-400">SKU: {activeSku}</span>
            </>
          )}
        </div>

        {/* Divider */}
        <hr className="my-4 border-gray-100" />

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-brand-black">{formatPrice(activePrice)}</span>
          {activeCompareAtPrice && (
            <>
              <span className="text-sm text-gray-400 line-through">{formatPrice(activeCompareAtPrice)}</span>
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-500">
                {discount}% OFF
              </span>
            </>
          )}
        </div>
        <p className="mt-1 text-[10px] text-gray-500">MRP incl. of all taxes</p>

        {/* Free shipping + delivery ETA */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
          <Truck size={14} className="text-brand-black" />
          <span><span className="font-semibold text-brand-black">Free shipping</span> over ₹499</span>
          <span className="text-gray-400">· Delivered by {eta.day}{eta.suffix} {eta.month}</span>
        </div>

        {/* Honest low-stock — only when the selected variant is genuinely low */}
        {Number.isFinite(Number(activeVariant?.stock)) && Number(activeVariant?.stock) > 0 && Number(activeVariant?.stock) <= 5 && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
            <AlertTriangle size={13} /> Only {Number(activeVariant.stock)} left
          </div>
        )}

        {/* Delivery / pincode serviceability */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-brand-black">Delivery Details</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
              aria-label="Pincode"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-black outline-none focus:border-brand-black"
            />
            <button
              type="button"
              onClick={handlePincodeCheck}
              disabled={checkingPin}
              className="shrink-0 rounded-lg bg-brand-black px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {checkingPin ? '…' : 'Check'}
            </button>
          </div>
          {serviceability && (
            <div className={cn(
              'mt-2.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold',
              serviceability.error ? 'text-red-600' : serviceability.serviceable ? 'text-green-700' : 'text-red-600'
            )}>
              {serviceability.error ? (
                <span>{serviceability.error}</span>
              ) : (
                <><Check size={14} /> Delivery to <span className="font-bold">{pincode}</span> in ~{serviceability.estimated_delivery_days || 5} days{serviceability.cod_available && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">COD available</span>}</>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <hr className="my-4 border-gray-100" />

        {/* Pack size selector — one tab per available pack size so a product
            with dozens of combos reads as a clean "Pack of 1 / 3 / 6" choice
            instead of one long grid. Only shown when there's more than one
            size to pick from. */}
        {packGroups.length > 1 && (
          <div className="mb-5">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-brand-black">
              Pack Size <span className="normal-case font-normal text-gray-600">— Pack of {activePack}</span>
            </p>
            <div role="radiogroup" aria-label="Select pack size" className="flex flex-wrap gap-2">
              {packGroups.map(([size, opts]) => (
                <button
                  key={size}
                  role="radio"
                  aria-checked={activePack === size}
                  onClick={() => handlePackSelect(size)}
                  className={cn(
                    'rounded-xl border-2 px-4 py-2 text-xs font-semibold transition-all',
                    activePack === size
                      ? 'border-brand-black bg-brand-black text-white'
                      : 'border-gray-200 text-brand-black hover:border-gray-400'
                  )}
                >
                  Pack of {size}
                  <span className={cn('ml-1.5 text-[10px] font-normal', activePack === size ? 'text-white/70' : 'text-gray-400')}>
                    ({opts.length})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Colour / combination selector — scoped to the chosen pack size */}
        {visibleColorOptions.length > 0 && (
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-brand-black">
              {activePack > 1 ? 'Combination' : 'Color'}{' '}
              <span className="normal-case font-normal text-gray-600">— {activeColor.name}</span>
            </p>
            <div role="radiogroup" aria-label="Select color" className="flex flex-wrap gap-2">
              {visibleColorOptions.map((color) =>
                color.packColors ? (
                  <button
                    key={color.name}
                    role="radio"
                    aria-checked={activeColor.name === color.name}
                    onClick={() => handleColorSelect(color)}
                    title={color.name}
                    className={cn(
                      'flex items-center gap-1 rounded-xl border-2 p-1.5 transition-all sm:px-2.5 sm:py-2.5',
                      activeColor.name === color.name ? 'border-brand-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                    )}
                  >
                    {color.packColors.map((pc, i) => (
                      <span key={`${pc.name}-${i}`} className="h-4 w-4 rounded-full border border-gray-200 sm:h-5 sm:w-5" style={{ backgroundColor: pc.hex }} />
                    ))}
                  </button>
                ) : (
                  <button
                    key={color.name}
                    role="radio"
                    aria-checked={activeColor.name === color.name}
                    onClick={() => handleColorSelect(color)}
                    title={color.name}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-all sm:h-8 sm:w-8',
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

        {/* Trust strip */}
        <div className="mt-5 grid grid-cols-4 gap-2 border-t border-gray-100 pt-4">
          {[
            [Lock, 'Secure Checkout'],
            [CreditCard, 'Cash on Delivery'],
            [RotateCcw, '7-Day Returns'],
            [ShieldCheck, '100% Genuine'],
          ].map(([Ic, label]) => (
            <div key={label} className="flex flex-col items-center gap-1.5 text-center">
              <Ic size={18} className="text-brand-black" strokeWidth={1.8} />
              <span className="text-[10px] font-semibold leading-tight text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <StickyATCBar
        visible={!atcVisible}
        productName={product.name}
        color={activeColor.name}
        price={activePrice}
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
