'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingBag, Eye } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlistStore'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'

interface ProductCardProps {
  id: string
  name: string
  price: number
  image: string
  hoverImage?: string
  rating?: number
  reviews?: number
  badge?: string
}

export default function ProductCard({
  id,
  name,
  price,
  image,
  hoverImage,
  rating = 4.5,
  reviews = 0,
  badge,
}: ProductCardProps) {
  const [mounted, setMounted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const { isInWishlist, toggleItem } = useWishlistStore()
  const { addItem } = useCartStore()
  const inWishlist = mounted ? isInWishlist(id) : false

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem({
      productId: id,
      name,
      price,
      image,
      material: '18K Yellow Gold',
      quantity: 1,
    })
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleItem({ id, name, price, image })
  }

  return (
    <div
      className="product-card group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="product-card-image aspect-square mb-4 relative">
        <Link href={`/products/${id}`}>
          <Image
            src={isHovered && hoverImage ? hoverImage : image}
            alt={name}
            fill
            className="object-cover transition-opacity duration-300"
          />
        </Link>
        
        {badge && (
          <span className="absolute top-3 left-3 bg-gold text-primary px-3 py-1 text-xs font-bold uppercase tracking-wider">
            {badge}
          </span>
        )}

        {/* Quick Actions */}
        <div
          className={`absolute inset-0 bg-black/20 flex items-center justify-center gap-2 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={handleAddToCart}
            className="p-3 bg-gold text-primary rounded-full hover:bg-darkGold transition-colors"
            aria-label="Add to cart"
          >
            <ShoppingBag size={20} />
          </button>
          <button
            onClick={handleWishlist}
            className={`p-3 rounded-full transition-colors ${
              inWishlist ? 'bg-gold text-primary' : 'bg-white text-primary hover:bg-gold'
            }`}
            aria-label="Add to wishlist"
          >
            <Heart size={20} fill={inWishlist ? 'currentColor' : 'none'} />
          </button>
          <Link
            href={`/products/${id}`}
            className="p-3 bg-white text-primary rounded-full hover:bg-gold transition-colors"
            aria-label="Quick view"
          >
            <Eye size={20} />
          </Link>
        </div>
      </div>

      <Link href={`/products/${id}`}>
        <div className="space-y-2">
          <h3 className="font-medium truncate">{name}</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-sm ${
                    i < Math.floor(rating) ? 'text-gold' : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm text-muted">({reviews})</span>
          </div>
          <p className="font-bold text-lg text-gold">{formatPrice(price)}</p>
        </div>
      </Link>
    </div>
  )
}
