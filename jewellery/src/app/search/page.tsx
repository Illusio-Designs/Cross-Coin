'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import ProductGrid from '@/components/product/ProductGrid'
import { products } from '@/lib/products'

export default function SearchPage() {
  const [query, setQuery] = useState('')

  const searchResults = query
    ? products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : []

  return (
    <div className="container-custom py-12">
      <h1 className="text-4xl font-serif font-bold mb-8">Search</h1>

      <div className="max-w-2xl mb-12">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for jewelry..."
            className="w-full px-6 py-4 pr-12 border border-gold/30 focus:outline-none focus:border-gold"
          />
          <button className="absolute right-4 top-1/2 -translate-y-1/2">
            <Search size={24} className="text-gold" />
          </button>
        </div>
      </div>

      {query && (
        <div>
          <p className="text-muted mb-6">
            Showing {searchResults.length} results for "{query}"
          </p>
          {searchResults.length > 0 ? (
            <ProductGrid products={searchResults} />
          ) : (
            <p className="text-center text-muted py-12">No products found</p>
          )}
        </div>
      )}
    </div>
  )
}
