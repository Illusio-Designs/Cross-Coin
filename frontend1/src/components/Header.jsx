import React from 'react';
import { FiUser, FiHeart } from "react-icons/fi";
import { BsCart } from "react-icons/bs";
import { HiOutlineSearch } from "react-icons/hi";
import Image from "next/image";
import Link from 'next/link';
import logo from '../assets/crosscoin_logo.webp';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const Header = () => {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  return (
    <header className="header">
      <div className="header__top">
        <div className="header__logo">
          <Link href="/">
            <Image src={logo} alt="logo" />
          </Link>
        </div>
        <div className="header__search">
          <input type="text" placeholder="Search for products, categories or brands..." />
          <button className="header__search-btn">
            <HiOutlineSearch />
          </button>
        </div>
        <div className="header__actions"> 
          <Link href="/login" className="header__account">
            <FiUser />
            <span>Sign In<br /><b>Account</b></span>
          </Link>
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
      <nav className="header__nav">
        <ul>
          <li><Link href="/Products">Products</Link></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header; 