'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingBag, Eye } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlistStore'
import { useCartStore } from '@/store/cartStore'

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
      size: 'M',
      color: 'Black',
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
          <span className="absolute top-3 left-3 bg-primary text-white px-3 py-1 text-xs font-medium">
            {badge}
          </span>
        )}

        {/* Quick Actions */}
        <div
          className={`absolute inset-0 bg-black/10 flex items-center justify-center gap-2 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={handleAddToCart}
            className="p-3 bg-white rounded-full hover:bg-primary hover:text-white transition-colors"
            aria-label="Add to cart"
          >
            <ShoppingBag size={20} />
          </button>
          <button
            onClick={handleWishlist}
            className={`p-3 bg-white rounded-full hover:bg-primary hover:text-white transition-colors ${
              inWishlist ? 'bg-primary text-white' : ''
            }`}
            aria-label="Add to wishlist"
          >
            <Heart size={20} fill={inWishlist ? 'currentColor' : 'none'} />
          </button>
          <Link
            href={`/products/${id}`}
            className="p-3 bg-white rounded-full hover:bg-primary hover:text-white transition-colors"
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
                    i < Math.floor(rating) ? 'text-primary' : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm text-muted">({reviews})</span>
          </div>
          <p className="font-bold text-lg">${price.toFixed(2)}</p>
        </div>
      </Link>
    </div>
  )
}
