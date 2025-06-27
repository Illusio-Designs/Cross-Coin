import React from "react";
import { AiOutlineMail } from "react-icons/ai";
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { MdOutlinePhoneInTalk } from "react-icons/md"; 
import Image from "next/image";
import visa from '../assets/visa.webp';
import mastercard from '../assets/mastercard.webp';
import paypal from '../assets/Paypal.webp';
import skrill from '../assets/Skrill.webp';
import klarna from '../assets/Klarna.webp';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__newsletter">
        <div className="footer__newsletter-content">
          <h4>Join our newsletter for $10 offs</h4>
          <p>Register now to get latest updates on promotions & coupons. Don't worry, we not spam!</p>
        </div>
        <div className="footer__newsletter-form-container">
        <form className="footer__newsletter-form">
          <div style={{ position: 'relative' }}>
            <AiOutlineMail style={{ position: 'absolute', left: '5px', top: '10px' }} />
            <input type="email" placeholder="Enter your email address" style={{ paddingLeft: '25px' }} />
          </div>
          <button type="submit">SEND</button>
        </form>
        <p className="footer__newsletter-policy">By subscribing you agree to our <a href="#">Terms & Conditions</a> and <a href="#">Privacy & Cookies Policy</a>.</p>
        </div>
      </div>
      <div className="footer__main">
        <div className="footer__col footer__brand">
          <div className="footer__logo">
            <span className="footer__logo">
            <Image src="/assets/crosscoin_logo.webp" alt="logo" unoptimized />
            </span>
          </div>
          <p>Register now to get latest updates on promotions & coupons. Don't worry, we not spam!</p>
          <div className="footer__social">
            <h2>Follow us on social media:</h2>
            <div className="footer__social-icons">
            <a href="#" className="facebook"><FaFacebookF /></a>
            <a href="#" className="twitter"><FaTwitter /></a>
            <a href="#" className="instagram"><FaInstagram /></a>
            <a href="#" className="linkedin"><FaLinkedinIn /></a>
            </div>
          </div>
        </div>
        <div className="footer__col">
          <h5>Our Expertise Products</h5>
          <ul>
            <li>Woollen Shocks</li>
            <li>Cotton Shocks</li>
            <li>Silk Shocks</li>
            <li>Winter Special Shocks</li>
            <li>Summer Special Shocks</li>
            <li>Net Shocks</li>
            <li>Rubber Shocks</li>
          </ul>
        </div>
        <div className="footer__col">
          <h5>Let Us Help You</h5>
          <ul>
            <li>Your Orders</li>
            <li>Returns & Replacements</li>
            <li>Shipping Rates & Policies</li>
            <li>Refund and Returns Policy</li>
            <li>Privacy Policy</li>
            <li>Terms and Conditions</li>
            <li>Cookie Settings</li>
            <li>Help Center</li>
          </ul>
        </div>
        <div className="footer__col footer__help">
          <h5>Do You Need Help ?</h5>
          <p>It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.</p>
          <div className="footer__contact">
            <div className="contact-item"><MdOutlinePhoneInTalk /> <span className="gap">Monday - Friday: 8:00 AM - 9:00 PM<br /><b className="bold">+91 9712891700 </b></span></div> 
            <div className="contact-item"><AiOutlineMail /> <span className="gap">Need help with your order?<br /><b className="bold">Crosscoinindia@gmail.com</b></span></div>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="footer__copyright">
          Copyright 2025 &copy; crosscoin PVT LTD. All right reserved
          <div className="footer__payments">
          <Image src={visa} alt="Visa" className="visa" unoptimized />
          <Image src={mastercard} alt="Mastercard" className="mastercard" unoptimized/>
          <Image src={paypal} alt="PayPal" className="paypal" unoptimized/>
          <Image src={skrill} alt="Skrill" className="skrill" unoptimized/>
          <Image src={klarna} alt="Klarna" className="klarna" unoptimized/>
        </div>
        </div>
       
        <div className="footer__links">
          <a href="/tc">Terms and Conditions</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Order Tracking</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 