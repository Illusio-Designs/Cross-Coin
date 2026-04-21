'use client'

import { useState } from 'react'
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
  const { addItem } = useCart()

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
        <div className="flex gap-3">
          {colorImages.length > 1 && (
            <div className="flex max-h-[280px] flex-col gap-2 overflow-y-auto sm:max-h-[360px] md:max-h-[420px]">
              {colorImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveThumb(i)}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 transition-all sm:h-14 sm:w-14 md:h-16 md:w-16 ${i === activeThumb ? 'border-brand-black' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-gray-50">
            <img src={displayImage} alt={product.name} className="h-full w-full min-h-[220px] sm:min-h-[260px] md:min-h-[300px]" />
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

          {/* Color selector */}
          {product.colors?.length > 0 && product.colors[0].name && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-400">
                Color — <span className="normal-case font-normal text-brand-black">{product.colors[activeColor]?.name}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c, i) => (
                  c.packColors ? (
                    <button key={c.name} title={c.name} onClick={() => selectColor(i)}
                      className={cn('flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all', i === activeColor ? 'border-brand-black bg-gray-50' : 'border-gray-200 hover:border-gray-400')}
                    >
                      <div className="flex gap-1">
                        {c.packColors.map((pc) => <span key={pc.name} className="h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: pc.hex }} />)}
                      </div>
                      <span className="text-[9px] font-semibold text-gray-400">Pack of {c.packColors.length}</span>
                    </button>
                  ) : (
                    <button key={c.name} title={c.name} onClick={() => selectColor(i)}
                      className={cn('h-7 w-7 rounded-full border-2 transition-all', i === activeColor ? 'border-brand-black ring-2 ring-brand-black ring-offset-2' : 'border-gray-200 hover:border-gray-400')}
                      style={{ backgroundColor: c.hex }}
                    />
                  )
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <p className="line-clamp-3 text-sm leading-relaxed text-gray-500">{product.description}</p>
          )}

          {/* Qty + CTA row */}
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2.5">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="text-gray-400 hover:text-brand-black"><Minus size={12} /></button>
              <span className="w-5 text-center text-sm font-medium text-brand-black">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="text-gray-400 hover:text-brand-black"><Plus size={12} /></button>
            </div>
            <button onClick={handleAdd}
              className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors',
                added ? 'bg-green-500 text-white' : 'bg-brand-black text-white hover:bg-gray-800')}
            >
              <ShoppingBag size={13} />
              {added ? 'Added!' : 'Add to Bag'}
            </button>
            <Link href={`/products/${product.handle}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-gray-200 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-black transition-colors hover:border-brand-black"
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
