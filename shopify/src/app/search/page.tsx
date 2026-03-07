'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import ProductGrid from '@/components/product/ProductGrid'

const searchResults = [
  {
    id: 'premium-athletic-socks',
    name: 'Premium Athletic Socks',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600',
    rating: 4.8,
    reviews: 124,
  },
  {
    id: 'comfort-casual-pack',
    name: 'Comfort Casual Pack',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
    rating: 4.7,
    reviews: 98,
  },
]

export default function SearchPage() {
  const [query, setQuery] = useState('')

  return (
    <div className="container-custom py-12">
      <h1 className="text-4xl font-bold mb-8">Search</h1>

      <div className="max-w-2xl mb-12">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for products..."
            className="w-full px-6 py-4 pr-12 border border-border rounded-none focus:outline-none focus:border-primary"
          />
          <button className="absolute right-4 top-1/2 -translate-y-1/2">
            <Search size={24} />
          </button>
        </div>
      </div>

      {query && (
        <div>
          <p className="text-muted mb-6">
            Showing {searchResults.length} results for "{query}"
          </p>
          <ProductGrid products={searchResults} />
        </div>
      )}
    </div>
  )
}
