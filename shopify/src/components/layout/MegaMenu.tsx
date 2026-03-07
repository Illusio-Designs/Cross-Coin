'use client'

import Link from 'next/link'
import Image from 'next/image'

const collections = [
  { name: 'Athletic Socks', href: '/collections/athletic', count: 24 },
  { name: 'Casual Socks', href: '/collections/casual', count: 32 },
  { name: 'Formal Socks', href: '/collections/formal', count: 18 },
  { name: 'Winter Socks', href: '/collections/winter', count: 15 },
  { name: 'Compression Socks', href: '/collections/compression', count: 12 },
  { name: 'No-Show Socks', href: '/collections/no-show', count: 20 },
]

export default function MegaMenu() {
  return (
    <div className="absolute left-0 top-full pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
      <div className="bg-white shadow-2xl border border-border p-8 w-screen max-w-4xl">
        <div className="grid grid-cols-3 gap-8">
          {/* Collections */}
          <div>
            <h3 className="font-bold text-lg mb-4">Collections</h3>
            <ul className="space-y-3">
              {collections.map((collection) => (
                <li key={collection.href}>
                  <Link
                    href={collection.href}
                    className="flex justify-between items-center link-hover"
                  >
                    <span>{collection.name}</span>
                    <span className="text-muted text-sm">({collection.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Featured Product */}
          <div>
            <h3 className="font-bold text-lg mb-4">Featured</h3>
            <Link href="/products/premium-athletic-socks" className="group/item">
              <div className="relative aspect-square mb-3 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400"
                  alt="Featured product"
                  fill
                  className="object-cover group-hover/item:scale-105 transition-transform duration-300"
                />
              </div>
              <h4 className="font-medium mb-1">Premium Athletic Socks</h4>
              <p className="text-sm text-muted">$24.99</p>
            </Link>
          </div>

          {/* Promotional Banner */}
          <div className="bg-gray-50 p-6 flex flex-col justify-center">
            <h3 className="font-bold text-xl mb-2">New Arrivals</h3>
            <p className="text-muted mb-4">
              Discover our latest collection of premium comfort socks
            </p>
            <Link href="/collections/new-arrivals" className="btn-primary inline-block text-center">
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
