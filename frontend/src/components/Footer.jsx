import React from "react";
import "../styles/components/Footer.css";
import { AiOutlineMail } from "react-icons/ai";
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { MdOutlinePhoneInTalk } from "react-icons/md"; // Changed to MdOutlinePhoneInTalk for stroke call icon

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
            <AiOutlineMail style={{ position: 'absolute', left: '5px', top: '15px' }} />
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
            <img src="/crosscoin_logo.png" alt="logo" />
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
            <div><MdOutlinePhoneInTalk /> <span>Monday-Friday: 08am-9pm<br /><b>0800 300 353 </b></span></div> 
            <div><AiOutlineMail /> <span>Need help with your order?<br /><b>info@example.com</b></span></div>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="footer__copyright">
          Copyright 2025 &copy; crosscoin PVT LTD. All right reserved
          <div className="footer__payments">
          <img src="/visa.png" alt="Visa" />
          <img src="/paypal.png" alt="PayPal" />
          <img src="/skrill.png" alt="Skrill" />
          <img src="/klarna.png" alt="Klarna" />
        </div>
        </div>
       
        <div className="footer__links">
          <a href="#">Terms and Conditions</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Order Tracking</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 