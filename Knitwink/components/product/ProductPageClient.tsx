'use client'

import { useState } from 'react'
import { ProductGallery } from './ProductGallery'
import { ProductInfo } from './ProductInfo'
import type { Product, ProductColor } from '@/types'

export function ProductPageClient({ product }: { product: Product }) {
  const [activeColor, setActiveColor] = useState<ProductColor>(
    product.colors[0] ?? { name: 'Default', hex: '#f2f0eb', imageIndex: 0 }
  )

  return (
    <div className="mx-auto max-w-site grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
      <ProductGallery
        images={product.images}
        colorImages={product.colorImages}
        activeColorName={activeColor.name}
        productName={product.name}
      />
      <ProductInfo
        product={product}
        onColorChange={setActiveColor}
      />
    </div>
  )
}
