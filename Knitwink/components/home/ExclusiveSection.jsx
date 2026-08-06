'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ShoppingBag, Zap, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatPrice, cn } from '@/lib/utils'

export function ExclusiveSection({ products = [] }) {
  const [active, setActive] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeThumb, setActiveThumb] = useState(0)
  const [activeColor, setActiveColor] = useState(0)
  const [paused, setPaused] = useState(false)
  const [railH, setRailH] = useState(0)          // main-image height → rail height
  const mainRef = useRef(null)
  const thumbsRef = useRef(null)
  const { addItem } = useCart()

  // Resolve the current gallery (selected colour's images) — used by the effects
  // below, which must run before any early return.
  const curImages = (() => {
    const p = products[active]
    if (!p) return []
    const cn = p.colors?.[activeColor]?.name
    return (cn && p.colorImages?.[cn]?.length) ? p.colorImages[cn] : (p.images || [])
  })()

  // Match the thumbnail rail height to the main image so both are the same height.
  useEffect(() => {
    const el = mainRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => setRailH(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [active, activeColor, products.length])

  // Auto-advance the main image through the gallery every 3s (pause on hover).
  useEffect(() => {
    if (curImages.length <= 1 || paused) return
    const t = setInterval(() => setActiveThumb((i) => (i + 1) % curImages.length), 3000)
    return () => clearInterval(t)
  }, [curImages.length, active, activeColor, paused])

  // Keep the active thumbnail in view by scrolling ONLY the rail (never the page).
  useEffect(() => {
    const rail = thumbsRef.current
    if (!rail) return
    const el = rail.querySelector('[data-active="true"]')
    if (!el) return
    const rr = rail.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    if (rail.scrollHeight > rail.clientHeight + 1) {
      rail.scrollBy({ top: (er.top - rr.top) - (rail.clientHeight - el.clientHeight) / 2, behavior: 'smooth' })
    }
  }, [activeThumb, active, activeColor])

  if (!products.length) {
    return (
      <section className="bg-white px-3 py-6">
        <p className="mb-5 text-center text-sm font-bold uppercase tracking-[0.25em] text-brand-black">
          Hand-Picked for You
        </p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {/* Image skeleton */}
          <div className="flex gap-3">
            <div className="hidden sm:flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 w-12 animate-pulse rounded-xl bg-gray-200 sm:h-14 sm:w-14 md:h-16 md:w-16" />
              ))}
            </div>
            <div className="flex-1 animate-pulse rounded-2xl bg-gray-200 min-h-[220px] sm:min-h-[260px] md:min-h-[300px]" />
          </div>
          {/* Spacer for lg 3-col layout */}
          <div className="hidden lg:block" />
          {/* Info skeleton */}
          <div className="flex flex-col gap-4">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-7 w-7 animate-pulse rounded-full bg-gray-200" />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-16 animate-pulse rounded-full bg-gray-200" />
              <div className="h-10 flex-1 animate-pulse rounded-full bg-gray-200" />
              <div className="h-10 flex-1 animate-pulse rounded-full bg-gray-200" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  const product = products[active]
  const colorName = product.colors?.[activeColor]?.name
  const colorImages =
    colorName && product.colorImages?.[colorName]?.length
      ? product.colorImages[colorName]
      : product.images || []
  const displayImage = colorImages[activeThumb]?.url || colorImages[0]?.url || ''

  /* Group this product's colours by pack size so the picker reads as a
     compact "Pack of 1 / 3 / 6" choice instead of one long mixed row.
     Each option keeps its original index so clicking still drives the
     existing index-based colour/image selection. */
  const packGroups = (() => {
    const groups = new Map()
    ;(product.colors || []).forEach((c, idx) => {
      if (!c.name) return
      const size = c.packColors?.length || 1
      if (!groups.has(size)) groups.set(size, [])
      groups.get(size).push({ ...c, _index: idx })
    })
    return [...groups.entries()].sort((a, b) => a[0] - b[0])
  })()
  // Active pack size is derived from the selected colour, so it's always
  // in sync (no extra state to reset when the product switches).
  const activePack = product.colors?.[activeColor]?.packColors?.length || 1
  const visibleColorOptions = packGroups.find(([s]) => s === activePack)?.[1] ?? []
  const handlePackSelect = (size) => {
    const first = packGroups.find(([s]) => s === size)?.[1]?.[0]
    if (first) selectColor(first._index)
  }

  const handleAdd = () => {
    const variant = product.variants?.find(v => v.color === colorName) || product.variants?.[0]
    addItem({
      id: variant?.id ?? product.id,
      productId: product.id,
      variantId: variant?.id ?? 'free-size',
      name: product.name,
      color: colorName || '',
      size: 'Free Size',
      price: product.price,
      quantity: qty,
      imageUrl: displayImage,
      handle: product.handle,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const selectProduct = (i) => { setActive(i); setQty(1); setActiveThumb(0); setActiveColor(0) }
  const selectColor = (i) => { setActiveColor(i); setActiveThumb(0) }

  return (
    <section className="bg-white px-3 py-6">
      {/* Simple title — same as TrustStrip */}
      <p className="mb-5 text-center text-sm font-bold uppercase tracking-[0.25em] text-brand-black">
        Hand-Picked for You
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1fr]">

        {/* LEFT — thumbnails + main image */}
        <div
          className="flex gap-3"
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPaused(true) }}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse') setPaused(false) }}
        >
          {colorImages.length > 1 && (
            <div
              ref={thumbsRef}
              style={railH ? { maxHeight: railH } : undefined}
              className="flex flex-col gap-2 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {colorImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveThumb(i)}
                  data-active={i === activeThumb ? 'true' : undefined}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 transition-all sm:h-14 sm:w-14 md:h-16 md:w-16 ${i === activeThumb ? 'border-brand-black' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div ref={mainRef} className="relative flex-1 overflow-hidden rounded-2xl bg-gray-50 aspect-square sm:aspect-auto">
            <img src={displayImage} alt={product.name} className="h-full w-full object-contain sm:object-fill sm:min-h-[260px] md:min-h-[300px]" />
            {product.badge && (
              <span className="absolute left-3 top-3 rounded-full bg-brand-black px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
                {product.badge}
              </span>
            )}
          </div>
        </div>

        {/* CENTER — product switcher (desktop) */}
        <div className="hidden flex-col items-center justify-center gap-3 lg:flex">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Products</p>
          <div className="flex flex-col gap-2">
            {products.map((p, i) => (
              <button
                key={p.id}
                onClick={() => selectProduct(i)}
                className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition-all ${i === active ? 'border-brand-black scale-105' : 'border-gray-200 opacity-50 hover:opacity-80'}`}
              >
                <img src={p.images?.[0]?.url || ''} alt={p.name} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => selectProduct(Math.max(0, active - 1))} disabled={active === 0} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 disabled:opacity-30 hover:border-brand-black hover:text-brand-black">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => selectProduct(Math.min(products.length - 1, active + 1))} disabled={active === products.length - 1} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 disabled:opacity-30 hover:border-brand-black hover:text-brand-black">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* RIGHT — info */}
        <div className="flex flex-col justify-center gap-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">{product.collectionName}</p>
            <h3 className="mt-1 text-xl font-semibold leading-snug text-brand-black lg:text-2xl">{product.name}</h3>
            {product.sku && <p className="mt-1 text-xs text-gray-400">SKU: {product.sku}</p>}
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-brand-black">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <>
                <span className="text-sm text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-500">
                  {Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          {/* Pack size + colour/combo selector */}
          {product.colors?.length > 0 && product.colors[0].name && (
            <div className="space-y-4">
              {/* Pack size tabs — only when more than one pack size exists */}
              {packGroups.length > 1 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-400">
                    Pack Size — <span className="normal-case font-normal text-brand-black">Pack of {activePack}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {packGroups.map(([size, opts]) => (
                      <button key={size} onClick={() => handlePackSelect(size)}
                        className={cn('rounded-xl border-2 px-3.5 py-1.5 text-xs font-semibold transition-all',
                          activePack === size ? 'border-brand-black bg-brand-black text-white' : 'border-gray-200 text-brand-black hover:border-gray-400')}
                      >
                        Pack of {size}
                        <span className={cn('ml-1 text-[10px] font-normal', activePack === size ? 'text-white/70' : 'text-gray-400')}>({opts.length})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colour / combination options for the selected pack size */}
              {visibleColorOptions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-400">
                    {activePack > 1 ? 'Combination' : 'Color'} — <span className="normal-case font-normal text-brand-black">{product.colors[activeColor]?.name}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {visibleColorOptions.map((c) => (
                      c.packColors ? (
                        <button key={c.name} title={c.name} onClick={() => selectColor(c._index)}
                          className={cn('no-touch-min flex items-center gap-1 rounded-xl border-2 p-1.5 transition-all sm:p-2', c._index === activeColor ? 'border-brand-black bg-gray-50' : 'border-gray-200 hover:border-gray-400')}
                        >
                          {c.packColors.map((pc, i) => <span key={`${pc.name}-${i}`} className="h-4 w-4 rounded-full border border-gray-200 sm:h-5 sm:w-5" style={{ backgroundColor: pc.hex }} />)}
                        </button>
                      ) : (
                        <button key={c.name} title={c.name} onClick={() => selectColor(c._index)}
                          className={cn('no-touch-min h-5 w-5 rounded-full border-2 transition-all sm:h-7 sm:w-7', c._index === activeColor ? 'border-brand-black ring-2 ring-brand-black ring-offset-2' : 'border-gray-200 hover:border-gray-400')}
                          style={{ backgroundColor: c.hex }}
                        />
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {product.description && (
            <p className="line-clamp-3 text-sm leading-relaxed text-gray-500">{product.description}</p>
          )}

          {/* Qty + CTA row — on mobile the qty + Add to Bag share a row and View
              drops to its own full-width line; from sm up all three sit inline. */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2.5">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="text-gray-400 hover:text-brand-black"><Minus size={12} /></button>
              <span className="w-5 text-center text-sm font-medium text-brand-black">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="text-gray-400 hover:text-brand-black"><Plus size={12} /></button>
            </div>
            <button onClick={handleAdd}
              className={cn('flex flex-1 basis-0 min-w-[140px] items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors',
                added ? 'bg-green-500 text-white' : 'bg-brand-black text-white hover:bg-gray-800')}
            >
              <ShoppingBag size={13} />
              {added ? 'Added!' : 'Add to Bag'}
            </button>
            <Link href={`/products/${product.handle}`}
              className="flex flex-1 basis-full sm:basis-0 items-center justify-center gap-1.5 rounded-full border border-gray-200 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-black transition-colors hover:border-brand-black"
            >
              <Zap size={13} />
              View
            </Link>
          </div>

          {/* Mobile strip */}
          <div className="flex items-center gap-2 overflow-x-auto lg:hidden">
            {products.map((p, i) => (
              <button key={p.id} onClick={() => selectProduct(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${i === active ? 'border-brand-black' : 'border-gray-200 opacity-50'}`}
              >
                <img src={p.images?.[0]?.url || ''} alt={p.name} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
