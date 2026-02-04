import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Left Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link href="/shop" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              SHOP
            </Link>
            <Link href="/grips" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              GRIPS
            </Link>
            <Link href="/accessories" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              ACCESSORIES
            </Link>
            <Link href="/sports" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              SPORTS
            </Link>
          </div>

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image 
              src="/assets/Gripzus.JPG.jpeg" 
              alt="GRIPZUS" 
              width={120} 
              height={60}
              className="h-12 lg:h-14 w-auto object-contain"
            />
          </Link>

          {/* Right Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link href="/professional" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              PROFESSIONAL
            </Link>
            <Link href="/custom" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              CUSTOM
            </Link>
            <Link href="/auth/login" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              SIGN IN/UP
            </Link>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col space-y-4">
              <Link href="/shop" className="text-sm font-medium text-gray-700 hover:text-black">SHOP</Link>
              <Link href="/grips" className="text-sm font-medium text-gray-700 hover:text-black">GRIPS</Link>
              <Link href="/accessories" className="text-sm font-medium text-gray-700 hover:text-black">ACCESSORIES</Link>
              <Link href="/sports" className="text-sm font-medium text-gray-700 hover:text-black">SPORTS</Link>
              <Link href="/professional" className="text-sm font-medium text-gray-700 hover:text-black">PROFESSIONAL</Link>
              <Link href="/custom" className="text-sm font-medium text-gray-700 hover:text-black">CUSTOM</Link>
              <Link href="/auth/login" className="text-sm font-medium text-gray-700 hover:text-black">SIGN IN/UP</Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}