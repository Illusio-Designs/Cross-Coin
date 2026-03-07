'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Heart, Truck, RotateCcw, Shield, Star } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useWishlistStore } from '@/store/wishlistStore'
import ProductGrid from './ProductGrid'
import { formatPrice } from '@/lib/utils'
import { products } from '@/lib/products'

const product = {
  id: 'diamond-solitaire-ring',
  name: 'Diamond Solitaire Ring',
  price: 2499.99,
  rating: 4.9,
  reviews: 234,
  description: 'Exquisite 1.5 carat diamond solitaire ring in 18K white gold. This timeless piece features a brilliant-cut diamond set in a classic four-prong setting, perfect for engagements or special occasions.',
  images: [
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
  ],
  sizes: ['5', '6', '7', '8', '9'],
  materials: ['18K White Gold', '18K Yellow Gold', 'Platinum'],
  features: [
    '1.5 carat brilliant-cut diamond',
    'GIA certified diamond',
    'Four-prong setting',
    'Comfort-fit band',
    'Lifetime warranty included',
    'Free resizing within first year',
  ],
}

const relatedProducts = products.slice(0, 4)

export default function ProductDetail({ productId }: { productId: string }) {
  const [mounted, setMounted] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState('7')
  const [selectedMaterial, setSelectedMaterial] = useState('18K White Gold')
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
      material: selectedMaterial,
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
                  selectedImage === index ? 'border-gold' : 'border-transparent'
                }`}
              >
                <Image src={image} alt={`${product.name} ${index + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-4xl font-serif font-bold mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'}
                  className={i < Math.floor(product.rating) ? 'text-gold' : 'text-gray-300'}
                />
              ))}
            </div>
            <span className="text-muted">({product.reviews} reviews)</span>
          </div>

          <p className="text-3xl font-bold text-gold mb-6">{formatPrice(product.price)}</p>

          <p className="text-muted mb-8">{product.description}</p>

          {/* Material Selector */}
          <div className="mb-6">
            <label className="block font-bold mb-3">Material</label>
            <div className="flex gap-2">
              {product.materials.map((material) => (
                <button
                  key={material}
                  onClick={() => setSelectedMaterial(material)}
                  className={`px-6 py-3 border-2 font-medium transition-colors ${
                    selectedMaterial === material
                      ? 'border-gold bg-gold text-primary'
                      : 'border-gold/30 hover:border-gold'
                  }`}
                >
                  {material}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div className="mb-6">
            <label className="block font-bold mb-3">Ring Size</label>
            <div className="flex gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-6 py-3 border-2 font-medium transition-colors ${
                    selectedSize === size
                      ? 'border-gold bg-gold text-primary'
                      : 'border-gold/30 hover:border-gold'
                  }`}
                >
                  {size}
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
                className="px-4 py-2 border border-gold/30 hover:bg-gold/10"
              >
                -
              </button>
              <span className="text-xl font-medium w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-4 py-2 border border-gold/30 hover:bg-gold/10"
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
                inWishlist ? 'border-gold bg-gold text-primary' : 'border-gold/30 hover:border-gold'
              }`}
            >
              <Heart size={24} fill={inWishlist ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Benefits */}
          <div className="space-y-4 border-t border-gold/20 pt-6">
            <div className="flex items-center gap-3">
              <Truck size={24} className="text-gold" />
              <div>
                <p className="font-medium">Free Insured Shipping</p>
                <p className="text-sm text-muted">On all orders</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RotateCcw size={24} className="text-gold" />
              <div>
                <p className="font-medium">30-Day Returns</p>
                <p className="text-sm text-muted">Hassle-free return policy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield size={24} className="text-gold" />
              <div>
                <p className="font-medium">Lifetime Warranty</p>
                <p className="text-sm text-muted">Comprehensive coverage</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="border-t border-gold/20 pt-12 mb-20">
        <div className="max-w-4xl">
          <h2 className="text-2xl font-serif font-bold mb-6">Product Features</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-gold mt-1">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Related Products */}
      <div>
        <h2 className="text-3xl font-serif font-bold mb-8">You May Also Like</h2>
        <ProductGrid products={relatedProducts} />
      </div>
    </div>
  )
}
