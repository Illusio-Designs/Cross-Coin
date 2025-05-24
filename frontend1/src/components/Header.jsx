import React from 'react';
import '../styles/components/Header.css';
import { FiUser, FiHeart } from "react-icons/fi";
import { BsCart } from "react-icons/bs";
import { HiOutlineSearch } from "react-icons/hi";
import Image from "next/image";
import logo from '../assets/crosscoin_logo.png';

const Header = () => {
  return (
    <header className="header">
      <div className="header__top">
        <div className="header__logo">
          <Image src={logo} alt="logo" />
        </div>
        <div className="header__search">
          <input type="text" placeholder="Search for products, categories or brands..." />
          <button className="header__search-btn">
            <HiOutlineSearch />
          </button>
        </div>
        <div className="header__actions"> 
          <div className="header__account">
            <FiUser />
            <span>Sign In<br /><b>Account</b></span>
          </div>
          <div className="header__wishlist">
            <FiHeart />
            <span className="header__badge">0</span>
          </div>
          <div className="header__cart">
            <BsCart />
            <span className="header__badge">0</span>
          </div>
        </div>
      </div>
      <nav className="header__nav">
        <ul>
          <li>New Arrivals <span className="header__tag header__tag--fresh">#Fresh</span></li>
          <li>Discounted <span className="header__tag header__tag--off">%50 OFF</span></li>
          <li>Winter wear</li>
          <li>Summer Wear</li>
          <li>Cotton</li>
          <li>Wools</li>
          <li>Silks</li>
          <li>Net</li>
          <li>Rubber</li>
          <li>Velvet</li>
        </ul>
      </nav>
    </header>
  );
};

export default Header; 