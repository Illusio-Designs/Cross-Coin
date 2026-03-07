'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Heart, Truck, RotateCcw, Shield, Star } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useWishlistStore } from '@/store/wishlistStore'
import ProductGrid from './ProductGrid'

const product = {
  id: 'premium-athletic-socks',
  name: 'Premium Athletic Socks',
  price: 24.99,
  rating: 4.8,
  reviews: 124,
  description: 'Experience ultimate comfort with our Premium Athletic Socks. Engineered with moisture-wicking technology and reinforced cushioning, these socks are perfect for any athletic activity.',
  images: [
    'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800',
    'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
    'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=800',
  ],
  sizes: ['S', 'M', 'L', 'XL'],
  colors: ['Black', 'White', 'Gray', 'Navy'],
  features: [
    'Premium combed cotton blend',
    'Moisture-wicking technology',
    'Reinforced heel and toe',
    'Arch support',
    'Seamless toe closure',
    'Anti-odor treatment',
  ],
}

const relatedProducts = [
  {
    id: 'comfort-casual-pack',
    name: 'Comfort Casual Pack',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
    rating: 4.7,
    reviews: 98,
  },
  {
    id: 'formal-dress-socks',
    name: 'Formal Dress Socks',
    price: 19.99,
    image: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=600',
    rating: 4.9,
    reviews: 156,
  },
  {
    id: 'winter-wool-socks',
    name: 'Winter Wool Socks',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600',
    rating: 4.6,
    reviews: 87,
  },
  {
    id: 'compression-sport-socks',
    name: 'Compression Sport Socks',
    price: 27.99,
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600',
    rating: 4.5,
    reviews: 65,
  },
]

export default function ProductDetail({ productId }: { productId: string }) {
  const [mounted, setMounted] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState('M')
  const [selectedColor, setSelectedColor] = useState('Black')
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCartStore()
  const { isInWishlist, toggleItem } = useWishlistStore()
  const inWishlist = mounted ? isInWishlist(product.id) : false

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      size: selectedSize,
      color: selectedColor,
      quantity,
    })
  }

  return (
    <div className="container-custom py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
        {/* Images */}
        <div>
          <div className="relative aspect-square mb-4 bg-gray-100">
            <Image
              src={product.images[selectedImage]}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative aspect-square border-2 ${
                  selectedImage === index ? 'border-primary' : 'border-transparent'
                }`}
              >
                <Image src={image} alt={`${product.name} ${index + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'}
                  className={i < Math.floor(product.rating) ? 'text-primary' : 'text-gray-300'}
                />
              ))}
            </div>
            <span className="text-muted">({product.reviews} reviews)</span>
          </div>

          <p className="text-3xl font-bold mb-6">${product.price.toFixed(2)}</p>

          <p className="text-muted mb-8">{product.description}</p>

          {/* Size Selector */}
          <div className="mb-6">
            <label className="block font-bold mb-3">Size</label>
            <div className="flex gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-6 py-3 border-2 font-medium transition-colors ${
                    selectedSize === size
                      ? 'border-primary bg-primary text-white'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className="mb-6">
            <label className="block font-bold mb-3">Color: {selectedColor}</label>
            <div className="flex gap-2">
              {product.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-6 py-3 border-2 font-medium transition-colors ${
                    selectedColor === color
                      ? 'border-primary bg-primary text-white'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-8">
            <label className="block font-bold mb-3">Quantity</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-2 border border-border hover:bg-gray-50"
              >
                -
              </button>
              <span className="text-xl font-medium w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-4 py-2 border border-border hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mb-8">
            <button onClick={handleAddToCart} className="flex-1 btn-primary">
              Add to Cart
            </button>
            <button
              onClick={() => toggleItem({ id: product.id, name: product.name, price: product.price, image: product.images[0] })}
              className={`p-4 border-2 transition-colors ${
                inWishlist ? 'border-primary bg-primary text-white' : 'border-border hover:border-primary'
              }`}
            >
              <Heart size={24} fill={inWishlist ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Benefits */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-3">
              <Truck size={24} />
              <div>
                <p className="font-medium">Free Shipping</p>
                <p className="text-sm text-muted">On orders over $50</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RotateCcw size={24} />
              <div>
                <p className="font-medium">Easy Returns</p>
                <p className="text-sm text-muted">30-day return policy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield size={24} />
              <div>
                <p className="font-medium">Secure Payment</p>
                <p className="text-sm text-muted">100% secure transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="border-t pt-12 mb-20">
        <div className="max-w-4xl">
          <h2 className="text-2xl font-bold mb-6">Product Features</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Related Products */}
      <div>
        <h2 className="text-3xl font-bold mb-8">You May Also Like</h2>
        <ProductGrid products={relatedProducts} />
      </div>
    </div>
  )
}
