import React from 'react';
import { FiUser, FiHeart } from "react-icons/fi";
import { BsCart } from "react-icons/bs";
import { HiOutlineSearch } from "react-icons/hi";
import Image from "next/image";
import Link from 'next/link';
import logo from '../assets/crosscoin_logo.webp';

const Header = () => {
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
          <div className="header__wishlist">
            <FiHeart />
            <span className="header__badge">0</span>
          </div>
          <Link href="/Cart" className="header__cart">
            <BsCart />
            <span className="header__badge">0</span>
          </Link>
        </div>
      </div>
      <nav className="header__nav">
        <ul>
          <li><Link href="/Products">Products</Link></li>
          <li><Link href="/ProductDetails">Product Details</Link></li>
          <li><Link href="/Cart">Cart</Link></li>
          <li><Link href="/Checkout">Checkout</Link></li>
          <li><Link href="/CheckoutUPI">Checkout UPI</Link></li>
          <li><Link href="/Shipping">Shipping</Link></li>
          <li><Link href="/login">Login</Link></li>
          <li><Link href="/register">Register</Link></li>
          <li><Link href="/profile">Profile</Link></li>
          <li><Link href="/ThankYou">Thank You</Link></li>
          <li><Link href="/policy">Policy</Link></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header; 