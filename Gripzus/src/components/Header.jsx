import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrency } from '../context/CurrencyContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const { currency, changeCurrency, currencies } = useCurrency();

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
              {/* Currency Selector */}
              <div className="currency-selector">
                <button 
                  className="currency-btn"
                  onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                  aria-label="Select currency"
                >
                  <span className="currency-flag">{currencies[currency].flag}</span>
                  <span className="currency-code">{currency}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: isCurrencyOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
                {isCurrencyOpen && (
                  <div className="currency-dropdown">
                    {Object.keys(currencies).map((code) => (
                      <button
                        key={code}
                        className={`currency-option ${currency === code ? 'active' : ''}`}
                        onClick={() => {
                          changeCurrency(code);
                          setIsCurrencyOpen(false);
                        }}
                      >
                        <span className="currency-flag">{currencies[code].flag}</span>
                        <span className="currency-info">
                          <span className="currency-name">{currencies[code].name}</span>
                          <span className="currency-code-small">{code} ({currencies[code].symbol})</span>
                        </span>
                        {currency === code && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <polyline points="20 6 9 17 4 12" stroke="var(--color-accent)" strokeWidth="2"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                className="icon-btn"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                aria-label="Search"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              <Link href="/account" className="icon-btn" aria-label="Account">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </Link>

              <Link href="/wishlist" className="icon-btn icon-btn-badge" aria-label="Wishlist">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                <span className="header-badge">0</span>
              </Link>

              <button className="icon-btn icon-btn-badge" aria-label="Cart">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
