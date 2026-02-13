import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrency } from '../context/CurrencyContext';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const { currency, changeCurrency, currencies } = useCurrency();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="headerContent">
            <Link href="/" className="logo">
              <Image 
                src="/assets/Knitwink.jpg.jpeg" 
                alt="Knitwink" 
                width={120} 
                height={40}
                style={{ objectFit: 'contain' }}
              />
            </Link>

            <nav className="nav">
              <Link href="/shop" className="navLink">Shop All</Link>
              <Link href="/collections/men" className="navLink">Men</Link>
              <Link href="/collections/women" className="navLink">Women</Link>
              <Link href="/collections/kids" className="navLink">Kids</Link>
              <Link href="/about" className="navLink">About</Link>
              <Link href="/contact" className="navLink">Contact</Link>
            </nav>

            <div className="headerIcons">
              <div className="currencySelector">
                <button 
                  className="currencyBtn"
                  onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                  aria-label="Select currency"
                >
                  <span className="currencyFlag">{currencies[currency].flag}</span>
                  <span className="currencyCode">{currency}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: isCurrencyOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
                {isCurrencyOpen && (
                  <>
                    <div className="currencyOverlay" onClick={() => setIsCurrencyOpen(false)}></div>
                    <div className="currencyDropdown">
                      {Object.keys(currencies).map((code) => (
                        <button
                          key={code}
                          className={`currencyOption ${currency === code ? 'active' : ''}`}
                          onClick={() => {
                            changeCurrency(code);
                            setIsCurrencyOpen(false);
                          }}
                        >
                          <span className="optionFlag">{currencies[code].flag}</span>
                          <div className="optionInfo">
                            <span className="optionName">{currencies[code].name}</span>
                            <span className="optionCode">{code} ({currencies[code].symbol})</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button className="iconBtn" aria-label="Search">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <Link href="/account" className="iconBtn" aria-label="Account">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </Link>
              <Link href="/cart" className="iconBtn cartBtn" aria-label="Cart">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M9 2L7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M15 2l2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M3 6h18l-2 13H5L3 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="cartBadge">0</span>
              </Link>
              
              <button 
                className="mobileMenuBtn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={`mobileMenu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobileMenuContent">
          <button 
            className="mobileMenuClose"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <nav className="mobileNav">
            <Link href="/shop" className="mobileNavLink">Shop All</Link>
            <Link href="/collections/men" className="mobileNavLink">Men</Link>
            <Link href="/collections/women" className="mobileNavLink">Women</Link>
            <Link href="/collections/kids" className="mobileNavLink">Kids</Link>
            <Link href="/about" className="mobileNavLink">About</Link>
            <Link href="/contact" className="mobileNavLink">Contact</Link>
          </nav>
        </div>
      </div>
    </>
  );
}
