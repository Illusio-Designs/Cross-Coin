'use client'

import { useState } from 'react'
import { ProductGallery } from './ProductGallery'
import { ProductInfo } from './ProductInfo'
import { Reveal } from '@/components/ui/Reveal'

export function ProductPageClient({ product }) {
  const [activeColor, setActiveColor] = useState(
    product.colors[0] ?? { name: 'Default', hex: '#f2f0eb', imageIndex: 0 }
  )

  return (
    <div className="relative mx-auto max-w-site">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
        {/* LEFT — Gallery (cols 1–7), sticky on desktop scroll */}
        <div className="min-w-0 lg:col-span-7 lg:sticky lg:top-[110px] lg:self-start">
          <Reveal>
            <ProductGallery
              images={product.images}
              colorImages={product.colorImages}
              activeColorName={activeColor.name}
              productName={product.name}
            />
          </Reveal>
        </div>

        {/* RIGHT — Editorial info (cols 8–12) */}
        <div className="min-w-0 lg:col-span-5">
          <Reveal delay={0.12}>
            <ProductInfo product={product} onColorChange={setActiveColor} />
          </Reveal>
        </div>
      </div>
    </div>
  )
}