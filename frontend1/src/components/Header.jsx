import React, { useState, useEffect } from 'react';
import { FiUser, FiHeart, FiSearch, FiMenu, FiX } from "react-icons/fi";
import { BsCart } from "react-icons/bs";
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/router';
import logo from '../assets/crosscoin_logo.webp';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [showSearch, setShowSearch] = useState(false);
  const [activePage, setActivePage] = useState('/');
  const [isSticky, setIsSticky] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setActivePage(router.pathname);
    // Close mobile menu on route change
    setIsMobileMenuOpen(false);
  }, [router.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      if (scrollPosition > 100) { // You can adjust this value to change when the header becomes sticky
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header ${isSticky ? 'header--sticky' : ''}`}>
      <div className="header__top">
        <div className="header__logo">
          <Link href="/">
            <Image src={logo} alt="logo" priority />
          </Link>
        </div>
        <nav className="header__nav">
          <ul>
            <li>
              <Link href="/" className={activePage === '/' ? 'active' : ''}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/Products" className={activePage === '/Products' ? 'active' : ''}>
                Products
              </Link>
            </li>
            <li>
              <Link href="/About" className={activePage === '/About' ? 'active' : ''}>
                About Us
              </Link>
            </li>
            <li>
              <Link href="/Contact" className={activePage === '/Contact' ? 'active' : ''}>
                Contact Us
              </Link>
            </li>
          </ul>
        </nav>
        <div className="header__actions"> 
          {isAuthenticated && user ? (
            <Link href="/profile" className="header__account">
              <FiUser />
              <span>{user.username}<br /><b>Account</b></span>
            </Link>
          ) : (
            <Link href="/login" className="header__account">
              <FiUser />
              <span>Sign In<br /><b>Account</b></span>
            </Link>
          )}
          <button className="header__search-icon" onClick={() => setShowSearch(true)}>
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
          className={`header__hamburger${isMobileMenuOpen ? ' open' : ''}`}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu${isMobileMenuOpen ? ' open' : ''}`}> 
        <nav className="mobile-menu__nav">
          <ul>
            <li>
              <Link href="/" className={activePage === '/' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/Products" className={activePage === '/Products' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                Products
              </Link>
            </li>
            <li>
              <Link href="/About" className={activePage === '/About' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                About Us
              </Link>
            </li>
            <li>
              <Link href="/Contact" className={activePage === '/Contact' ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                Contact Us
              </Link>
            </li>
          </ul>
          <div className="mobile-menu__actions">
            {isAuthenticated && user ? (
              <Link href="/profile" className="header__account" onClick={() => setIsMobileMenuOpen(false)}>
                <FiUser />
                <span>{user.username}<br /><b>Account</b></span>
              </Link>
            ) : (
              <Link href="/login" className="header__account" onClick={() => setIsMobileMenuOpen(false)}>
                <FiUser />
                <span>Sign In<br /><b>Account</b></span>
              </Link>
            )}
            <Link href="/Wishlist" className="header__wishlist" onClick={() => setIsMobileMenuOpen(false)}>
              <FiHeart />
              <span className="header__badge">{wishlistCount}</span>
            </Link>
            <Link href="/UnifiedCheckout" className="header__cart" onClick={() => setIsMobileMenuOpen(false)}>
              <BsCart />
              <span className="header__badge">{cartCount}</span>
            </Link>
          </div>
        </nav>
      </div>
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setIsMobileMenuOpen(false)}></div>}

      {showSearch && (
        <div className="search-overlay" onClick={() => setShowSearch(false)}>
          <div className="search-container" onClick={e => e.stopPropagation()}>
            <div className="search-content">
              <input type="text" placeholder="Search for products, categories or brands..." />
              <button className="search-close" onClick={() => setShowSearch(false)}>×</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 