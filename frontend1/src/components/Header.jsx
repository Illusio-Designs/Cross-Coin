import React, { useState, useEffect } from 'react';
import { FiUser, FiHeart, FiSearch } from "react-icons/fi";
import { BsCart } from "react-icons/bs";
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/router';
import logo from '../assets/crosscoin_logo.webp';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const Header = () => {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [showSearch, setShowSearch] = useState(false);
  const [activePage, setActivePage] = useState('/');
  const [isSticky, setIsSticky] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setActivePage(router.pathname);
  }, [router.pathname]);

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
          <Link href="/login" className="header__account">
            <FiUser />
            <span>Sign In<br /><b>Account</b></span>
          </Link>
          <button className="header__search-icon" onClick={() => setShowSearch(true)}>
            <FiSearch />
          </button>
          <Link href="/Wishlist" className="header__wishlist">
            <FiHeart />
            <span className="header__badge">{wishlistCount}</span>
          </Link>
          <Link href="/Cart" className="header__cart">
            <BsCart />
            <span className="header__badge">{cartCount}</span>
          </Link>
        </div>
      </div>

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