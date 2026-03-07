'use client'

import { useState } from 'react'
import ProductGrid from '@/components/product/ProductGrid'
import FilterSidebar from './FilterSidebar'
import { SlidersHorizontal } from 'lucide-react'

const allProducts = [
  {
    id: 'premium-athletic-socks',
    name: 'Premium Athletic Socks',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600',
    rating: 4.8,
    reviews: 124,
    badge: 'Best Seller',
  },
  {
    id: 'comfort-casual-pack',
    name: 'Comfort Casual Pack',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=600',
    rating: 4.7,
    reviews: 98,
  },
  {
    id: 'formal-dress-socks',
    name: 'Formal Dress Socks',
    price: 19.99,
    image: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600',
    rating: 4.9,
    reviews: 156,
  },
  {
    id: 'winter-wool-socks',
    name: 'Winter Wool Socks',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
    rating: 4.6,
    reviews: 87,
    badge: 'New',
  },
  {
    id: 'compression-sport-socks',
    name: 'Compression Sport Socks',
    price: 27.99,
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600',
    rating: 4.5,
    reviews: 65,
  },
  {
    id: 'no-show-ankle-socks',
    name: 'No-Show Ankle Socks',
    price: 16.99,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
    rating: 4.4,
    reviews: 92,
  },
  {
    id: 'merino-wool-hiking',
    name: 'Merino Wool Hiking Socks',
    price: 39.99,
    image: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=600',
    rating: 4.9,
    reviews: 143,
    badge: 'Premium',
  },
  {
    id: 'cotton-crew-basics',
    name: 'Cotton Crew Basics',
    price: 22.99,
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600',
    rating: 4.6,
    reviews: 78,
  },
]

export default function CollectionPage() {
  const [sortBy, setSortBy] = useState('best-selling')
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="container-custom py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">All Products</h1>
        <p className="text-muted">{allProducts.length} products</p>
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <FilterSidebar />
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-border hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal size={20} />
              Filters
            </button>

            <div className="flex items-center gap-4 ml-auto">
              <label htmlFor="sort" className="text-sm font-medium">
                Sort by:
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-border rounded-none focus:outline-none focus:border-primary"
              >
                <option value="best-selling">Best Selling</option>
                <option value="price-low-high">Price: Low to High</option>
                <option value="price-high-low">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="lg:hidden mb-6 p-4 border border-border">
              <FilterSidebar />
            </div>
          )}

          {/* Products */}
          <ProductGrid products={allProducts} />
        </div>
      </div>
    </div>
  )
}
