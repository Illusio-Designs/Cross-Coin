'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlistStore'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import type { Product } from '@/types'

export function WishlistPageClient() {
  const { items, removeItem, toggle } = useWishlistStore()
  const { addItem } = useCart()

  const addAll = () => {
    items.forEach((product) => {
      const variant = product.variants[0]
      const color = product.colors[0]
      const image = product.images[0]
      if (variant && color) {
        addItem({
          id: variant.id,
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          color: color.name,
          size: variant.size,
          price: product.price,
          quantity: 1,
          imageUrl: image?.url ?? '',
          handle: product.handle,
        })
      }
    })
  }

  if (items.length === 0) {
    return (
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
          <Heart size={48} className="text-gray-200" />
          <h1 className="font-display text-3xl font-normal text-brand-black">Your wishlist is empty</h1>
          <p className="text-base text-gray-600">Save items you love and come back to them later.</p>
          <Link
            href="/collections/all"
            className="inline-flex items-center justify-center rounded-full bg-sage px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition-colors duration-150 hover:bg-sage-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage"
          >
            Shop Now
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-6 py-16 md:px-10 lg:px-16">
      <div className="mx-auto max-w-site">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-normal text-brand-black">
          Wishlist ({items.length})
        </h1>
        <Button onClick={addAll}>Add All to Cart</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {items.map((product) => (
          <WishlistCard key={product.id} product={product} onRemove={() => toggle(product)} onAddToCart={() => {
            const variant = product.variants[0]
            const color = product.colors[0]
            const image = product.images[0]
            if (variant && color) {
              addItem({
                id: variant.id,
                productId: product.id,
                variantId: variant.id,
                name: product.name,
                color: color.name,
                size: variant.size,
                price: product.price,
                quantity: 1,
                imageUrl: image?.url ?? '',
                handle: product.handle,
              })
            }
          }} />
        ))}
      </div>
    </div>
    </section>
  )
}

function WishlistCard({
  product,
  onRemove,
  onAddToCart,
}: {
  product: Product
  onRemove: () => void
  onAddToCart: () => void
}) {
  const image = product.images[0]

  return (
    <div className="group flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gray-100 md:aspect-[3/4]">
        <Link href={ROUTES.product(product.handle)} className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2">
          {image && (
            <Image
              src={image.url}
              alt={image.alt}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-150 group-hover:-translate-y-0.5"
            />
          )}
        </Link>
        {/* Remove (filled heart) */}
        <button
          onClick={onRemove}
          aria-label={`Remove ${product.name} from wishlist`}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-black transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
        >
          <Heart size={14} fill="currentColor" />
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="truncate text-sm text-gray-800">{product.name}</p>
        <p className="text-sm font-medium text-brand-black">{formatPrice(product.price)}</p>
      </div>

      <button
        onClick={onAddToCart}
        className="rounded-full border border-brand-black px-4 py-2 text-xs font-medium uppercase tracking-wider text-brand-black transition-colors duration-150 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
      >
        Add to Cart
      </button>
    </div>
  )
}
