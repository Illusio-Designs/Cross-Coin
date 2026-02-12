import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      {/* Promo Bar */}
      <div className="promo-bar">
        <div className="container">
          <div className="promo-content">
            <span>Free Shipping on Orders Over $50</span>
            <span className="separator">|</span>
            <span>Easy 30-Day Returns</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            {/* Mobile Menu Toggle */}
            <button 
              className="menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            {/* Logo */}
            <Link href="/" className="logo">
              <Image 
                src="/assets/Gripzus.JPG.jpeg" 
                alt="Gripzus Logo" 
                width={120} 
                height={40}
                priority
                className="logo-image"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
              <Link href="/collections/new-arrivals">New Arrivals</Link>
              <Link href="/collections/men">Men</Link>
              <Link href="/collections/women">Women</Link>
              <Link href="/collections/accessories">Accessories</Link>
              <Link href="/collections/sale">Sale</Link>
            </nav>

            {/* Header Actions */}
            <div className="header-actions">
              <button 
                className="icon-btn"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                aria-label="Search"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              <Link href="/account" className="icon-btn" aria-label="Account">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 19a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </Link>

              <Link href="/wishlist" className="icon-btn icon-btn-badge" aria-label="Wishlist">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 18.35l-1.45-1.32C3.4 12.36 0 9.28 0 5.5 0 2.42 2.42 0 5.5 0 7.24 0 8.91.81 10 2.09 11.09.81 12.76 0 14.5 0 17.58 0 20 2.42 20 5.5c0 3.78-3.4 6.86-8.55 11.54L10 18.35z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                </svg>
                <span className="header-badge">0</span>
              </Link>

              <button className="icon-btn icon-btn-badge" aria-label="Cart">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M1 1h3l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L22 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="9" cy="20" r="1" fill="currentColor"/>
                  <circle cx="20" cy="20" r="1" fill="currentColor"/>
                </svg>
                <span className="header-badge">0</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="search-bar">
            <div className="container">
              <div className="search-wrapper">
                <input 
                  type="text" 
                  placeholder="Search for products..." 
                  className="search-input"
                  autoFocus
                />
                <button className="search-btn">Search</button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
