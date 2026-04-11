'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Zap, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { useCart } from '@/hooks/useCart'

export function ExclusiveSection({ products = [] }) {
  const [active, setActive] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeThumb, setActiveThumb] = useState(0)
  const [activeColor, setActiveColor] = useState(0)
  const { addItem } = useCart()

  if (!products.length) return null

  const product = products[active]
  const colorName = product.colors?.[activeColor]?.name
  const colorImages =
    colorName && product.colorImages?.[colorName]?.length
      ? product.colorImages[colorName]
      : product.images || []
  const displayImage = colorImages[activeThumb]?.url || colorImages[0]?.url || ''

  const handleAdd = () => {
    addItem({
      id: product.variants?.[0]?.id ?? product.id,
      productId: product.id,
      variantId: product.variants?.[0]?.id ?? 'free-size',
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
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-brand-black px-4 py-10 md:px-8 md:py-14">

      {/* Header — centered */}
      <div className="mb-8 text-center">
        <h2 className="mt-1 font-display text-3xl font-normal text-white lg:text-4xl">
          Unlocked <span className="font-semibold">Exclusives</span>
        </h2>
        <p className="mt-1 text-sm text-white/50">Our most coveted pieces, now available</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto_1fr]">

        {/* LEFT — thumbnail rail + main image */}
        <div className="flex gap-3">
          {colorImages.length > 1 && (
            <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
              {colorImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveThumb(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${i === activeThumb ? 'border-white' : 'border-white/20 opacity-50 hover:opacity-80'}`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-white/5">
            <img
              src={displayImage}
              alt={product.name}
              className="h-full w-full object-contain"
              style={{ minHeight: 300 }}
            />
            {product.badge && (
              <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-brand-black">
                {product.badge}
              </span>
            )}
          </div>
        </div>

        {/* CENTER — product switcher desktop */}
        <div className="hidden flex-col items-center justify-center gap-3 lg:flex">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Products</p>
          <div className="flex flex-col gap-2">
            {products.map((p, i) => (
              <button
                key={p.id}
                onClick={() => selectProduct(i)}
                className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition-all ${i === active ? 'border-white scale-105' : 'border-white/20 opacity-40 hover:opacity-70'}`}
              >
                <img src={p.images?.[0]?.url || ''} alt={p.name} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => selectProduct(Math.max(0, active - 1))} disabled={active === 0} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white disabled:opacity-20 hover:border-white">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => selectProduct(Math.min(products.length - 1, active + 1))} disabled={active === products.length - 1} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white disabled:opacity-20 hover:border-white">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* RIGHT — product info */}
        <div className="flex flex-col justify-center gap-5">

          {/* Name + SKU */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">{product.collectionName}</p>
            <h3 className="mt-1 text-xl font-semibold leading-snug text-white lg:text-2xl">{product.name}</h3>
            {product.sku && <p className="mt-1 text-xs text-white/30">SKU: {product.sku}</p>}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-white">&#8377;{product.price}</span>
            {product.compareAtPrice && (
              <>
                <span className="text-sm text-white/40 line-through">&#8377;{product.compareAtPrice}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
                  {Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          {/* Color selector */}
          {product.colors?.length > 0 && product.colors[0].name && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/40">
                Color &mdash; <span className="normal-case font-normal text-white/70">{product.colors[activeColor]?.name}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c, i) => (
                  <button
                    key={c.name}
                    title={c.name}
                    onClick={() => selectColor(i)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all ${i === activeColor ? 'border-white bg-white/10' : 'border-white/20 hover:border-white/50'}`}
                  >
                    {/* Pack: multiple dots side by side */}
                    {c.packColors ? (
                      <>
                        <div className="flex gap-1">
                          {c.packColors.map((pc) => (
                            <span key={pc.name} className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: pc.hex }} />
                          ))}
                        </div>
                        <span className="text-[9px] font-semibold text-white/60">Pack of {c.packColors.length}</span>
                      </>
                    ) : (
                      <span className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <p className="line-clamp-3 text-sm leading-relaxed text-white/50">{product.description}</p>
          )}

          {/* Qty + Add to Bag + View — single row */}
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-3 py-2.5">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="text-white/60 hover:text-white">
                <Minus size={12} />
              </button>
              <span className="w-5 text-center text-sm font-medium text-white">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="text-white/60 hover:text-white">
                <Plus size={12} />
              </button>
            </div>

            <button
              onClick={handleAdd}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${added ? 'bg-green-500 text-white' : 'bg-white text-brand-black hover:bg-gray-100'}`}
            >
              <ShoppingBag size={13} />
              {added ? 'Added!' : 'Add to Bag'}
            </button>

            <Link
              href={`/products/${product.handle}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/30 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:border-white hover:bg-white/10"
            >
              <Zap size={13} />
              View
            </Link>
          </div>

          {/* Mobile product strip */}
          <div className="flex items-center gap-2 overflow-x-auto lg:hidden">
            {products.map((p, i) => (
              <button
                key={p.id}
                onClick={() => selectProduct(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${i === active ? 'border-white' : 'border-white/20 opacity-40'}`}
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
