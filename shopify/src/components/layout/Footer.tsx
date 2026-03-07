import Link from 'next/link'
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-border mt-20">
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Info */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-bold mb-4">PREMIUM SOCKS</h3>
            <p className="text-muted mb-6 max-w-sm">
              Comfort starts from your feet. Premium cotton socks designed for everyday comfort and style.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="p-2 hover:bg-gray-200 rounded-full transition-colors" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="#" className="p-2 hover:bg-gray-200 rounded-full transition-colors" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className="p-2 hover:bg-gray-200 rounded-full transition-colors" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="p-2 hover:bg-gray-200 rounded-full transition-colors" aria-label="Youtube">
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-4">Shop</h4>
            <ul className="space-y-2">
              <li><Link href="/collections" className="text-muted link-hover">All Products</Link></li>
              <li><Link href="/collections/best-sellers" className="text-muted link-hover">Best Sellers</Link></li>
              <li><Link href="/collections/new-arrivals" className="text-muted link-hover">New Arrivals</Link></li>
              <li><Link href="/collections/sale" className="text-muted link-hover">Sale</Link></li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h4 className="font-bold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link href="/contact" className="text-muted link-hover">Contact Us</Link></li>
              <li><Link href="/shipping" className="text-muted link-hover">Shipping Info</Link></li>
              <li><Link href="/returns" className="text-muted link-hover">Returns</Link></li>
              <li><Link href="/faq" className="text-muted link-hover">FAQ</Link></li>
              <li><Link href="/size-guide" className="text-muted link-hover">Size Guide</Link></li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-muted link-hover">About Us</Link></li>
              <li><Link href="/privacy" className="text-muted link-hover">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-muted link-hover">Terms of Service</Link></li>
              <li><Link href="/refund" className="text-muted link-hover">Refund Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-border pt-8 mb-8">
          <div className="max-w-md mx-auto text-center">
            <h4 className="font-bold text-lg mb-2">Subscribe to our newsletter</h4>
            <p className="text-muted mb-4">Get 10% off your first order</p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 border border-border rounded-none focus:outline-none focus:border-primary"
              />
              <button type="submit" className="btn-primary">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Payment Icons & Copyright */}
        <div className="border-t border-border pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted">
              © 2024 Premium Socks. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">We accept:</span>
              <div className="flex gap-2">
                {['Visa', 'Mastercard', 'Amex', 'PayPal'].map((payment) => (
                  <div
                    key={payment}
                    className="px-3 py-1 border border-border rounded text-xs font-medium"
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
