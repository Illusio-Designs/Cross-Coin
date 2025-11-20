import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FiUser, FiHeart, FiSearch, FiMenu, FiX } from "react-icons/fi";
import { BsCart } from "react-icons/bs";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
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
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    setActivePage(router.pathname);
    // Close mobile menu on route change
    setIsMobileMenuOpen(false);
  }, [router.pathname]);

  // Memoized API URL to prevent unnecessary re-renders
  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
    []
  );

  // Debounced search function with useCallback optimization
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const response = await fetch(
          `${apiUrl}/api/products/search?query=${encodeURIComponent(query)}`
        );
        const data = await response.json();

        if (data.success) {
          setSearchResults(data.data?.products || data.products || []);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [apiUrl]
  );

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

  // Optimized scroll handler with throttling
  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    setIsSticky(scrollPosition > 100);
    
    // Hide header on scroll down, show on scroll up (mobile only)
    if (window.innerWidth <= 768) {
      if (scrollPosition > lastScrollY && scrollPosition > 100) {
        // Scrolling down
        setIsHeaderVisible(false);
      } else {
        // Scrolling up
        setIsHeaderVisible(true);
      }
      setLastScrollY(scrollPosition);
    } else {
      // Always show header on desktop
      setIsHeaderVisible(true);
    }
  }, [lastScrollY]);

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
        <div className="header__logo">
          <Link href="/">
            <Image
              src="/assets/crosscoin_logo.webp"
              alt="logo"
              width={120}
              height={40}
              priority
              unoptimized
            />
          </Link>
        </div>
        <nav className="header__nav">
          <ul>
            <li>
              <Link href="/" className={activePage === "/" ? "active" : ""}>
                Home
              </Link>
            </li>
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
          {isAuthenticated && user ? (
            <Link href="/profile" className="header__account">
              <FiUser />
              <span>
                {user.username}
                <br />
                <b>Account</b>
              </span>
            </Link>
          ) : (
            <Link href="/login" className="header__account">
              <FiUser />
              <span>
                Sign In
                <br />
                <b>Account</b>
              </span>
            </Link>
          )}
          <button
            className="header__search-icon"
            aria-label="Open search"
            onClick={() => setShowSearch(true)}
          >
            <FiSearch />
          </button>
          <Link href="/Wishlist" className="header__wishlist">
            <FiHeart />
            <span className="header__badge">{wishlistCount}</span>
          </Link>
          <Link href="/UnifiedCheckout" className="header__cart">
            <BsCart />
            <span className="header__badge">{cartCount}</span>
          </Link>
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
                href="/"
                className={activePage === "/" ? "active" : ""}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
            </li>
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
              <Link
                href="/profile"
                className="header__account"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FiUser />
                <span>
                  {user.username}
                  <br />
                  <b>Account</b>
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="header__account"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FiUser />
                <span>
                  Sign In
                  <br />
                  <b>Account</b>
                </span>
              </Link>
            )}
            <Link
              href="/Wishlist"
              className="header__wishlist"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiHeart />
              <span className="header__badge">{wishlistCount}</span>
            </Link>
            <Link
              href="/UnifiedCheckout"
              className="header__cart"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <BsCart />
              <span className="header__badge">{cartCount}</span>
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

      {showSearch && (
        <div className="search-overlay" onClick={handleSearchOverlayClick}>
          <div
            className="search-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="search-content">
              <form onSubmit={handleSearchSubmit} className="search-form">
                <input
                  type="text"
                  placeholder="Search for products, categories or brands..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  autoFocus
                  className="search-input"
                />
                <button type="submit" className="search-submit">
                  <FiSearch />
                </button>
              </form>
              <button
                className="search-close"
                onClick={() => setShowSearch(false)}
              >
                ×
              </button>
            </div>

            {/* Search Results */}
            {searchQuery && (
              <div className="search-results">
                {isSearching ? (
                  <div className="search-loading">
                    <div className="loading-spinner"></div>
                    <span>Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="search-results-list">
                    <h4>Search Results ({searchResults.length})</h4>
                    {searchResults.slice(0, 5).map((product) => (
                      <div
                        key={product.id}
                        className="search-result-item"
                        onClick={() => handleSearchResultClick(product)}
                      >
                        <div className="search-result-image">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={
                                product.images[0].image_url ||
                                product.images[0].url ||
                                product.images[0]
                              }
                              alt={product.name}
                              onError={(e) => {
                                e.target.src = "/assets/card1-left.webp";
                              }}
                            />
                          ) : (
                            <img src="/assets/card1-left.webp" alt="No image" />
                          )}
                        </div>
                        <div className="search-result-info">
                          <h5>{product.name}</h5>
                          <p className="search-result-price">
                            {product.variations && product.variations.length > 0
                              ? `₹${Math.min(
                                  ...product.variations.map((v) => v.price)
                                )}`
                              : `₹${product.price || "N/A"}`}
                          </p>
                        </div>
                      </div>
                    ))}
                    {searchResults.length > 5 && (
                      <div className="search-view-all">
                        <button
                          type="button"
                          onClick={() => {
                            router.push(
                              `/SearchResults?query=${encodeURIComponent(
                                searchQuery
                              )}`
                            );
                            setShowSearch(false);
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                        >
                          View All Results ({searchResults.length})
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="search-no-results">
                    <p>No products found for "{searchQuery}"</p>
                    <button
                      type="button"
                      onClick={() => {
                        router.push(
                          `/SearchResults?query=${encodeURIComponent(
                            searchQuery
                          )}`
                        );
                        setShowSearch(false);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                    >
                      Search All Products
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
