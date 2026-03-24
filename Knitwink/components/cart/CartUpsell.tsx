'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

interface CartUpsellProps {
  products: Product[]
}

export function CartUpsell({ products }: CartUpsellProps) {
  const { addItem } = useCart()

  if (!products.length) return null

  return (
    <div className="mt-8 border-t border-gray-200 pt-8">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-gray-600">
        You might also like
      </p>
      <ul className="flex flex-col gap-4">
        {products.map((product) => {
          const image = product.images[0]
          const firstVariant = product.variants[0]
          const firstColor = product.colors[0]

          return (
            <li key={product.id} className="flex items-center gap-4">
              <Link
                href={`/products/${product.handle}`}
                className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
              >
                {image && (
                  <Image src={image.url} alt={image.alt} fill className="object-cover" />
                )}
              </Link>

              <div className="flex flex-1 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-800">{product.name}</p>
                  <p className="text-xs text-gray-600">{formatPrice(product.price)}</p>
                </div>
                <button
                  onClick={() =>
                    firstVariant &&
                    firstColor &&
                    addItem({
                      id: firstVariant.id,
                      productId: product.id,
                      variantId: firstVariant.id,
                      name: product.name,
                      color: firstColor.name,
                      size: firstVariant.size,
                      price: product.price,
                      quantity: 1,
                      imageUrl: image?.url ?? '',
                      handle: product.handle,
                    })
                  }
                  className="shrink-0 rounded-full border border-brand-black px-4 py-2 text-xs font-medium uppercase tracking-wider text-brand-black transition-colors duration-150 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
                >
                  Add
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
