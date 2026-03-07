import Link from 'next/link'
import { Facebook, Instagram, Twitter, Youtube, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-primary text-white mt-20">
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Info */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-serif font-bold mb-4">
              <span className="text-white">LUXURY</span>
              <span className="text-gold"> JEWELLERY</span>
            </h3>
            <p className="text-gray-300 mb-6 max-w-sm">
              Timeless elegance and exquisite craftsmanship. Discover our exclusive collection of fine jewelry.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="p-2 bg-gold/10 hover:bg-gold hover:text-primary rounded-full transition-colors" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="#" className="p-2 bg-gold/10 hover:bg-gold hover:text-primary rounded-full transition-colors" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className="p-2 bg-gold/10 hover:bg-gold hover:text-primary rounded-full transition-colors" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="p-2 bg-gold/10 hover:bg-gold hover:text-primary rounded-full transition-colors" aria-label="Youtube">
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Collections */}
          <div>
            <h4 className="font-bold text-gold mb-4">Collections</h4>
            <ul className="space-y-2">
              <li><Link href="/collections/rings" className="text-gray-300 hover:text-gold transition-colors">Rings</Link></li>
              <li><Link href="/collections/necklaces" className="text-gray-300 hover:text-gold transition-colors">Necklaces</Link></li>
              <li><Link href="/collections/earrings" className="text-gray-300 hover:text-gold transition-colors">Earrings</Link></li>
              <li><Link href="/collections/bracelets" className="text-gray-300 hover:text-gold transition-colors">Bracelets</Link></li>
              <li><Link href="/collections/watches" className="text-gray-300 hover:text-gold transition-colors">Watches</Link></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="font-bold text-gold mb-4">Customer Care</h4>
            <ul className="space-y-2">
              <li><Link href="/contact" className="text-gray-300 hover:text-gold transition-colors">Contact Us</Link></li>
              <li><Link href="/shipping" className="text-gray-300 hover:text-gold transition-colors">Shipping Info</Link></li>
              <li><Link href="/returns" className="text-gray-300 hover:text-gold transition-colors">Returns</Link></li>
              <li><Link href="/sizing" className="text-gray-300 hover:text-gold transition-colors">Ring Sizing</Link></li>
              <li><Link href="/care" className="text-gray-300 hover:text-gold transition-colors">Jewelry Care</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-gold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-gray-300 hover:text-gold transition-colors">About Us</Link></li>
              <li><Link href="/privacy" className="text-gray-300 hover:text-gold transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-300 hover:text-gold transition-colors">Terms of Service</Link></li>
              <li><Link href="/warranty" className="text-gray-300 hover:text-gold transition-colors">Warranty</Link></li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-gold/20 pt-8 mb-8">
          <div className="max-w-md mx-auto text-center">
            <Mail className="mx-auto mb-4 text-gold" size={32} />
            <h4 className="font-serif font-bold text-xl mb-2">Join Our Exclusive Circle</h4>
            <p className="text-gray-300 mb-4">Receive updates on new collections and special offers</p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-white/10 border border-gold/30 text-white placeholder-gray-400 focus:outline-none focus:border-gold"
              />
              <button type="submit" className="btn-primary">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gold/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-300">
              © 2024 Luxury Jewellery. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300">We accept:</span>
              <div className="flex gap-2">
                {['Visa', 'Mastercard', 'Amex', 'PayPal'].map((payment) => (
                  <div
                    key={payment}
                    className="px-3 py-1 bg-white/10 border border-gold/30 text-xs font-medium text-gold"
                  >
                    {payment}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
