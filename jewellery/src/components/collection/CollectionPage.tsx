'use client'

import { useState } from 'react'
import ProductGrid from '@/components/product/ProductGrid'
import FilterSidebar from './FilterSidebar'
import { SlidersHorizontal } from 'lucide-react'
import { products } from '@/lib/products'

export default function CollectionPage() {
  const [sortBy, setSortBy] = useState('best-selling')
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="container-custom py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-bold mb-4">All Jewelry</h1>
        <p className="text-muted">{products.length} exquisite pieces</p>
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <FilterSidebar />
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gold/20">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gold/30 hover:bg-gold/10 transition-colors"
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
                className="px-4 py-2 border border-gold/30 focus:outline-none focus:border-gold"
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
            <div className="lg:hidden mb-6 p-4 border border-gold/20">
              <FilterSidebar />
            </div>
          )}

          {/* Products */}
          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  )
}
