'use client'

import { useState } from 'react'
import { ProductGallery } from './ProductGallery'
import { ProductInfo } from './ProductInfo'

export function ProductPageClient({ product }) {
  const [activeColor, setActiveColor] = useState(
    product.colors[0] ?? { name: 'Default', hex: '#f2f0eb', imageIndex: 0 }
  )

  return (
    <div className="mx-auto max-w-site grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
      {/* Gallery — scrolls naturally */}
      <div className="min-w-0">
        <ProductGallery
          images={product.images}
          colorImages={product.colorImages}
          activeColorName={activeColor.name}
          productName={product.name}
        />
      </div>

      {/* Info — sticky while gallery scrolls */}
      <div className="min-w-0 lg:sticky lg:top-[110px] lg:self-start">
        <ProductInfo product={product} onColorChange={setActiveColor} />
      </div>
    </div>
  )
}
