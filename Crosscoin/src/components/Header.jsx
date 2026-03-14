import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import SafeImage from "./common/SafeImage";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

// Custom SVG icons matching reference design
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" className="icon">
    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="#221F20" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 21L16.65 16.65" stroke="#221F20" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WishlistIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" className="icon">
    <path d="M12 4.95276C9.55556 -0.930046 1 -0.303473 1 7.21544C1 14.7343 12 21 12 21C12 21 23 14.7343 23 7.21544C23 -0.303473 14.4444 -0.930046 12 4.95276Z" stroke="#221F20" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" className="icon">
    <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="#221F20" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 6H21" stroke="#221F20" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="#221F20" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" className="icon">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 20C4 17.3333 6.66667 14 12 14C17.3333 14 20 17.3333 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
import { debounce } from "lodash";

const Header = () => {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [showSearch, setShowSearch] = useState(false);
  const [activePage, setActivePage] = useState("/");
  const [isSticky, setIsSticky] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    setActivePage(router.pathname);
    // Close mobile menu on route change
    setIsMobileMenuOpen(false);
  }, [router.pathname]);

  // Memoized API URL to prevent unnecessary re-renders
  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in",
    []
  );

  // Debounced search function with useCallback optimization
  const debouncedSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

      try {
        setIsSearching(true);
        const response = await fetch(
          `${apiUrl}/api/products/search?query=${encodeURIComponent(query)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Brand-Name': 'crosscoin'
            }
          }
        );
        const data = await response.json();

        if (data.success) {
          setSearchResults(data.data?.products || data.products || []);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, [apiUrl]);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/SearchResults?query=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  // Handle search result click
  const handleSearchResultClick = (product) => {
    router.push(`/ProductDetails?slug=${product.slug}`);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Close search when clicking outside
  const handleSearchOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [isMobileMenuOpen]);

  // Optimized scroll handler with throttling using useRef to avoid re-renders
  const lastScrollYRef = useRef(0);
  
  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    setIsSticky(scrollPosition > 100);
    
    // Hide header on scroll down, show on scroll up (mobile only)
    if (window.innerWidth <= 768) {
      if (scrollPosition > lastScrollYRef.current && scrollPosition > 100) {
        // Scrolling down
        setIsHeaderVisible(false);
      } else {
        // Scrolling up
        setIsHeaderVisible(true);
      }
      lastScrollYRef.current = scrollPosition;
    } else {
      // Always show header on desktop
      setIsHeaderVisible(true);
    }
  }, []);

  useEffect(() => {
    let ticking = false;
    const optimizedScrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", optimizedScrollHandler, {
      passive: true,
    });
    return () => window.removeEventListener("scroll", optimizedScrollHandler);
  }, [handleScroll]);

  return (
    <header className={`header ${isSticky ? "header--sticky" : ""} ${!isHeaderVisible ? "header--hidden" : ""}`}>
        <div className="header__top">
        <div className="header__logo" onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }}>
          <SafeImage
            imageData={{ image_url: "/assets/crosscoin_logo.webp" }}
            alt="logo"
            width={120}
            height={48}
            priority={true}
            quality={90}
            style={{ objectFit: 'contain' }}
            isLogo={true}
          />
        </div>
        <nav className="header__nav">
          <ul>
            <li>
              <Link
                href="/Products"
                className={activePage === "/Products" ? "active" : ""}
              >
                Products
              </Link>
            </li>
            <li>
              <Link
                href="/Collections"
                className={activePage === "/Collections" ? "active" : ""}
              >
                Collections
              </Link>
            </li>
            <li>
              <Link
                href="/About"
                className={activePage === "/About" ? "active" : ""}
              >
                About Us
              </Link>
            </li>
            <li>
              <Link
                href="/Contact"
                className={activePage === "/Contact" ? "active" : ""}
              >
                Contact Us
              </Link>
            </li>
            <li>
              <Link
                href="/OrderTracking"
                className={activePage === "/OrderTracking" ? "active" : ""}
              >
                Track Order
              </Link>
            </li>
          </ul>
        </nav>
        <div className="header__actions">
          <div className="header__search-wrap">
            <form className="header__search-form" onSubmit={handleSearchSubmit}>
              <button type="submit" className="header__search-btn" aria-label="Search">
                <SearchIcon />
              </button>
              <input
                type="text"
                className="header__search-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              />
            </form>
            {showSearch && searchQuery && (
              <div className="search-dropdown-results">
                {isSearching ? (
                  <div className="search-loading">
                    <div className="loading-spinner"></div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    {searchResults.slice(0, 5).map((product) => (
                      <div
                        key={product.id}
                        className="search-result-item"
                        onMouseDown={() => handleSearchResultClick(product)}
                      >
                        <div className="search-result-image">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0].image_url || product.images[0].url || product.images[0]}
                              alt={product.name}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="search-result-placeholder" />
                          )}
                        </div>
                        <div className="search-result-info">
                          <h5>{product.name}</h5>
                          <p className="search-result-price">
                            {product.variations && product.variations.length > 0
                              ? `₹${Math.min(...product.variations.map((v) => v.price))}`
                              : `₹${product.price || 'N/A'}`}
                          </p>
                        </div>
                      </div>
                    ))}
                    {searchResults.length > 5 && (
                      <div className="search-view-all">
                        <button type="button" onMouseDown={() => {
                          router.push(`/SearchResults?query=${encodeURIComponent(searchQuery)}`);
                          setShowSearch(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}>
                          View All ({searchResults.length})
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="search-no-results">
                    <p>No results for "{searchQuery}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <Link href="/Wishlist" className="header__wishlist">
            <WishlistIcon />
            {wishlistCount > 0 && <span className="header__badge">{wishlistCount}</span>}
          </Link>
          <Link href="/UnifiedCheckout" className="header__cart">
            <CartIcon />
            {cartCount > 0 && <span className="header__badge">{cartCount}</span>}
          </Link>
          {isAuthenticated && user ? (
            <Link href="/profile" className="header__account">
              <UserIcon />
            </Link>
          ) : (
            <Link href="/login" className="header__account">
              <UserIcon />
            </Link>
          )}
        </div>
        {/* Hamburger Icon for Mobile */}
        <button
          className={`header__hamburger${isMobileMenuOpen ? " open" : ""}`}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu${isMobileMenuOpen ? " open" : ""}`}>
        <nav className="mobile-menu__nav">
          <ul>
            <li>
              <Link
                href="/Products"
                className={activePage === "/Products" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Products
              </Link>
            </li>
            <li>
              <Link
                href="/Collections"
                className={activePage === "/Collections" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Collections
              </Link>
            </li>
            <li>
              <Link
                href="/About"
                className={activePage === "/About" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About Us
              </Link>
            </li>
            <li>
              <Link
                href="/Contact"
                className={activePage === "/Contact" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact Us
              </Link>
            </li>
            <li>
              <Link
                href="/OrderTracking"
                className={activePage === "/OrderTracking" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Track Order
              </Link>
            </li>
          </ul>
          <div className="mobile-menu__actions">
            {isAuthenticated && user ? (
              <Link href="/profile" className="header__account" onClick={() => setIsMobileMenuOpen(false)}>
                <UserIcon />
              </Link>
            ) : (
              <Link href="/login" className="header__account" onClick={() => setIsMobileMenuOpen(false)}>
                <UserIcon />
              </Link>
            )}
            <Link href="/Wishlist" className="header__wishlist" onClick={() => setIsMobileMenuOpen(false)}>
              <WishlistIcon />
              {wishlistCount > 0 && <span className="header__badge">{wishlistCount}</span>}
            </Link>
            <Link href="/UnifiedCheckout" className="header__cart" onClick={() => setIsMobileMenuOpen(false)}>
              <CartIcon />
              {cartCount > 0 && <span className="header__badge">{cartCount}</span>}
            </Link>
          </div>
        </nav>
      </div>
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="mobile-menu-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* search handled inline in header__search-wrap */}
    </header>
  );
};

export default Header;

