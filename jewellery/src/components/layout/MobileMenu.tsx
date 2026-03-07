'use client'

import { X, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

const menuItems = [
  { name: 'Home', href: '/' },
  { name: 'Collections', href: '/collections' },
  { name: 'Best Sellers', href: '/collections/best-sellers' },
  { name: 'New Arrivals', href: '/collections/new-arrivals' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

const collections = [
  { name: 'Rings', href: '/collections/rings' },
  { name: 'Necklaces', href: '/collections/necklaces' },
  { name: 'Earrings', href: '/collections/earrings' },
  { name: 'Bracelets', href: '/collections/bracelets' },
  { name: 'Watches', href: '/collections/watches' },
]

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 overflow-y-auto lg:hidden"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-serif font-bold">
                  <span className="text-primary">LUXURY</span>
                  <span className="text-gold"> JEWELLERY</span>
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Main Menu */}
              <nav className="space-y-1 mb-8">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center justify-between py-3 px-4 hover:bg-gold/10 rounded-lg transition-colors"
                  >
                    <span className="font-medium">{item.name}</span>
                    <ChevronRight size={20} className="text-gold" />
                  </Link>
                ))}
              </nav>

              {/* Collections */}
              <div className="border-t border-gold/20 pt-6">
                <h3 className="font-serif font-bold mb-4 text-gold">Collections</h3>
                <div className="space-y-1">
                  {collections.map((collection) => (
                    <Link
                      key={collection.href}
                      href={collection.href}
                      onClick={onClose}
                      className="block py-2 px-4 hover:bg-gold/10 rounded-lg transition-colors"
                    >
                      {collection.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Account Link */}
              <div className="border-t border-gold/20 mt-6 pt-6">
                <Link
                  href="/account"
                  onClick={onClose}
                  className="block py-3 px-4 bg-gold text-primary text-center font-medium hover:bg-darkGold transition-colors uppercase tracking-wider"
                >
                  My Account
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
