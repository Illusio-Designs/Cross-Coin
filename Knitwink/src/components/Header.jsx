import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useCurrency } from '../context/CurrencyContext';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMegaMenuPinned, setIsMegaMenuPinned] = useState(false);
  const { currency, changeCurrency, currencies } = useCurrency();
  const router = useRouter();

  const isActive = (path) => {
    return router.pathname === path || router.pathname.startsWith(path);
  };

  const handleMegaMenuClick = () => {
    const newPinnedState = !isMegaMenuPinned;
    setIsMegaMenuPinned(newPinnedState);
    setIsMegaMenuOpen(newPinnedState);
  };

  const handleMegaMenuHover = (isHovering) => {
    if (!isMegaMenuPinned) {
      setIsMegaMenuOpen(isHovering);
    }
  };

  const closeMegaMenu = () => {
    setIsMegaMenuPinned(false);
    setIsMegaMenuOpen(false);
  };

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
              <Link href="/" className={`navLink ${isActive('/') && router.pathname === '/' ? 'active' : ''}`}>Home</Link>
              <Link href="/products" className={`navLink ${isActive('/products') ? 'active' : ''}`}>Products</Link>
              <div 
                className="navItemWithMega"
                onMouseEnter={() => handleMegaMenuHover(true)}
                onMouseLeave={() => handleMegaMenuHover(false)}
              >
                <button 
                  className={`navLinkBtn ${isActive('/collections') ? 'active' : ''}`}
                  onClick={handleMegaMenuClick}
                >
                  Collections
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '4px' }}>
                    <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
              <Link href="/about" className={`navLink ${isActive('/about') ? 'active' : ''}`}>About</Link>
              <Link href="/contact" className={`navLink ${isActive('/contact') ? 'active' : ''}`}>Contact</Link>
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

                <button 
                  className="iconBtn" 
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  aria-label="Search"
                >
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

        {/* Mega Menu */}
        {isMegaMenuOpen && (
          <div 
            onMouseEnter={() => handleMegaMenuHover(true)}
            onMouseLeave={() => handleMegaMenuHover(false)}
          >
            {isMegaMenuPinned && <div className="megaMenuOverlay" onClick={closeMegaMenu}></div>}
            <div className="megaMenu">
              <div className="container">
                <div className="megaMenuGrid">
                  <div className="megaMenuCol">
                    <h3>Men&apos;s Socks</h3>
                    <ul>
                      <li><Link href="/products?filter=men" onClick={closeMegaMenu}>All Men&apos;s</Link></li>
                      <li><Link href="/collections/men" onClick={closeMegaMenu}>Dress Socks</Link></li>
                      <li><Link href="/collections/men" onClick={closeMegaMenu}>Athletic Socks</Link></li>
                      <li><Link href="/collections/men" onClick={closeMegaMenu}>Casual Socks</Link></li>
                      <li><Link href="/collections/men" onClick={closeMegaMenu}>Winter Socks</Link></li>
                    </ul>
                  </div>
                  <div className="megaMenuCol">
                    <h3>Women&apos;s Socks</h3>
                    <ul>
                      <li><Link href="/products?filter=women" onClick={closeMegaMenu}>All Women&apos;s</Link></li>
                      <li><Link href="/collections/women" onClick={closeMegaMenu}>Ankle Socks</Link></li>
                      <li><Link href="/collections/women" onClick={closeMegaMenu}>Knee High</Link></li>
                      <li><Link href="/collections/women" onClick={closeMegaMenu}>Compression</Link></li>
                      <li><Link href="/collections/women" onClick={closeMegaMenu}>Cozy Socks</Link></li>
                    </ul>
                  </div>
                  <div className="megaMenuCol">
                    <h3>Kids Socks</h3>
                    <ul>
                      <li><Link href="/products?filter=accessories" onClick={closeMegaMenu}>All Kids</Link></li>
                      <li><Link href="/collections/accessories" onClick={closeMegaMenu}>School Socks</Link></li>
                      <li><Link href="/collections/accessories" onClick={closeMegaMenu}>Sports Socks</Link></li>
                      <li><Link href="/collections/accessories" onClick={closeMegaMenu}>Fun Patterns</Link></li>
                      <li><Link href="/collections/accessories" onClick={closeMegaMenu}>Character Socks</Link></li>
                    </ul>
                  </div>
                  <div className="megaMenuCol">
                    <h3>Shop by Type</h3>
                    <ul>
                      <li><Link href="/products?filter=new-arrivals" onClick={closeMegaMenu}>New Arrivals</Link></li>
                      <li><Link href="/products?filter=sale" onClick={closeMegaMenu}>Sale Items</Link></li>
                      <li><Link href="/products" onClick={closeMegaMenu}>Bestsellers</Link></li>
                      <li><Link href="/products" onClick={closeMegaMenu}>Gift Sets</Link></li>
                    </ul>
                  </div>
                  <div className="megaMenuFeatured">
                    <img src="https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600" alt="Featured Collection" />
                    <div className="megaMenuFeaturedContent">
                      <h4>New Arrivals</h4>
                      <p>Premium Comfort Collection</p>
                      <Link href="/products" className="btn btn-sm btn-primary" onClick={closeMegaMenu}>Shop Now</Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="searchOverlay">
          <div className="searchOverlayBg" onClick={() => setIsSearchOpen(false)}></div>
          <div className="searchContainer">
            <div className="container">
              <div className="searchContent">
                <button 
                  className="searchClose"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label="Close search"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <form className="searchForm">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="searchIcon">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search for products..." 
                    className="searchInput"
                    autoFocus
                  />
                  <button type="submit" className="searchSubmit">
                    Search
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <Link href="/" className={`mobileNavLink ${isActive('/') && router.pathname === '/' ? 'active' : ''}`}>Home</Link>
            <Link href="/products" className={`mobileNavLink ${isActive('/products') ? 'active' : ''}`}>Products</Link>
            <Link href="/collections/men" className={`mobileNavLink ${isActive('/collections/men') ? 'active' : ''}`}>Men&apos;s Socks</Link>
            <Link href="/collections/women" className={`mobileNavLink ${isActive('/collections/women') ? 'active' : ''}`}>Women&apos;s Socks</Link>
            <Link href="/collections/accessories" className={`mobileNavLink ${isActive('/collections/accessories') ? 'active' : ''}`}>Kids Socks</Link>
            <Link href="/about" className={`mobileNavLink ${isActive('/about') ? 'active' : ''}`}>About</Link>
            <Link href="/contact" className={`mobileNavLink ${isActive('/contact') ? 'active' : ''}`}>Contact</Link>
          </nav>
        </div>
      </div>
    </>
  );
}
