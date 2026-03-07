'use client'

import Link from 'next/link'
import Image from 'next/image'

const collections = [
  { name: 'Rings', href: '/collections/rings', count: 156 },
  { name: 'Necklaces', href: '/collections/necklaces', count: 98 },
  { name: 'Earrings', href: '/collections/earrings', count: 124 },
  { name: 'Bracelets', href: '/collections/bracelets', count: 87 },
  { name: 'Watches', href: '/collections/watches', count: 45 },
  { name: 'Wedding Jewelry', href: '/collections/wedding', count: 67 },
]

export default function MegaMenu() {
  return (
    <div className="absolute left-0 top-full pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
      <div className="bg-white shadow-2xl border border-gold/20 p-8 w-screen max-w-4xl">
        <div className="grid grid-cols-3 gap-8">
          {/* Collections */}
          <div>
            <h3 className="font-serif font-bold text-lg mb-4 text-gold">Collections</h3>
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
            <h3 className="font-serif font-bold text-lg mb-4 text-gold">Featured</h3>
            <Link href="/products/diamond-solitaire-ring" className="group/item">
              <div className="relative aspect-square mb-3 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400"
                  alt="Featured product"
                  fill
                  className="object-cover group-hover/item:scale-105 transition-transform duration-300"
                />
              </div>
              <h4 className="font-medium mb-1">Diamond Solitaire Ring</h4>
              <p className="text-sm text-gold font-bold">$2,499.99</p>
            </Link>
          </div>

          {/* Promotional Banner */}
          <div className="bg-gradient-to-br from-primary to-gray-900 text-white p-6 flex flex-col justify-center">
            <h3 className="font-serif font-bold text-xl mb-2 text-gold">New Collection</h3>
            <p className="text-gray-300 mb-4">
              Discover our latest designs crafted with precision and elegance
            </p>
            <Link href="/collections/new-arrivals" className="btn-primary inline-block text-center">
              Explore Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
