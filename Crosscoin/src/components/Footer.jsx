import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AiOutlineMail } from "react-icons/ai";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { MdOutlinePhoneInTalk } from "react-icons/md"; 
import SafeImage from "./common/SafeImage";
import { getPublicCategories } from "../services/publicApi";

const Footer = () => {
  const [categories, setCategories] = useState([]);
  const [email, setEmail] = useState("");
  const [hoveredLink, setHoveredLink] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getPublicCategories();
        if (Array.isArray(data)) {
          setCategories(data.slice(0, 8));
        } else if (data && Array.isArray(data.categories)) {
          setCategories(data.categories.slice(0, 8));
        } else {
          setCategories([]);
        }
      } catch (error) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    setEmail("");
  };

  return (
    <footer className="footer">
      {/* Popular Searches Section */}
      <div className="footer__popular-searches">
        <h3>Popular Searches</h3>
        <div className="footer__search-grid">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/Products?category=${encodeURIComponent(cat.name)}`} className="footer__search-link">
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="footer__newsletter-section">
        <h3>BE THE FIRST TO KNOW</h3>
        <p>Subscribe to our newsletter for exclusive offers, new arrivals, and insider updates.</p>
        <form className="footer__newsletter-form" onSubmit={handleNewsletterSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Subscribe</button>
        </form>
      </div>

      {/* Main Footer Content */}
      <div className="footer__main">
        <div className="footer__col footer__about">
          <h4>About</h4>
          <ul>
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/careers">Careers</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/press">Press</Link></li>
          </ul>
        </div>

        <div className="footer__col footer__account">
          <h4>Account</h4>
          <ul>
            <li><Link href="/account">My Account</Link></li>
            <li><Link href="/orders">My Orders</Link></li>
            <li><Link href="/wishlist">Wishlist</Link></li>
            <li><Link href="/cart">Shopping Cart</Link></li>
          </ul>
        </div>

        <div className="footer__col footer__policy">
          <h4>Policy</h4>
          <ul>
            <li><Link href="/policy?name=privacy-policy">Privacy Policy</Link></li>
            <li><Link href="/policy?name=terms-and-conditions">Terms & Conditions</Link></li>
            <li><Link href="/policy?name=shipping-policy">Shipping Policy</Link></li>
            <li><Link href="/policy?name=cancellation-and-refund">Cancellation & Refund</Link></li>
          </ul>
        </div>

        <div className="footer__col footer__help">
          <h4>Help</h4>
          <div className="footer__contact">
            <div className="contact-item">
              <MdOutlinePhoneInTalk className="contact-icon" />
              <div className="contact-info">
                <p className="contact-label">Monday - Friday: 8:00 AM - 9:00 PM</p>
                <a 
                  href="tel:+919712891700" 
                  className="contact-link"
                  onMouseEnter={() => setHoveredLink('phone')}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  +91 9712891700
                </a>
              </div>
            </div>
            <div className="contact-item">
              <AiOutlineMail className="contact-icon" />
              <div className="contact-info">
                <p className="contact-label">Email Support</p>
                <a 
                  href="mailto:Crosscoinindia@gmail.com" 
                  className="contact-link"
                  onMouseEnter={() => setHoveredLink('email')}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  Crosscoinindia@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="footer__col footer__brand">
          <div className="footer__logo">
            <SafeImage 
              imageData={{ image_url: "/assets/crosscoin_logo.webp" }}
              alt="CrossCoin Logo" 
              width={150} 
              height={60}
              quality={90}
              style={{ objectFit: 'contain' }}
              isLogo={true}
            />
          </div>
          <p>Premium quality socks designed for comfort and style. Join our community for exclusive deals and special offers.</p>
          <div className="footer__social">
            <h5>Follow Us</h5>
            <div className="footer__social-icons">
              <a href="https://www.facebook.com/people/Cross-Coin/61577195743730/" className="social-icon facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                <FaFacebookF />
              </a>
              <a href="https://www.instagram.com/crosscoin99/?igsh=d2FiY29iemhtb2Nl" className="social-icon instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <FaInstagram />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer__bottom">
        <span className="footer__copyright">
          Copyright 2025 &copy; CrossCoin. All rights reserved.
        </span>
        <span className="footer__credit">
          Design & Develop with <span role="img" aria-label="love">❤️</span> by 
          <a href="https://illusiodesigns.agency/" target="_blank" rel="noopener noreferrer">
            Illusio Designs
          </a>
        </span>
      </div>
    </footer>
  );
};

export default Footer; 