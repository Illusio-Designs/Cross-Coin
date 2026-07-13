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
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 xl:gap-20">
      {/* LEFT — Gallery (~58%) */}
      <div className="min-w-0 lg:col-span-7">
        <Reveal>
          <ProductGallery
            images={product.images}
            colorImages={product.colorImages}
            activeColorName={activeColor.name}
            productName={product.name}
          />
        </Reveal>
      </div>

      {/* RIGHT — Buy column (~42%), sticky on desktop */}
      <div className="min-w-0 lg:col-span-5 lg:sticky lg:top-32 lg:self-start">
        <Reveal delay={0.12}>
          <ProductInfo product={product} onColorChange={setActiveColor} />
        </Reveal>
      </div>
    </div>
  )
}
