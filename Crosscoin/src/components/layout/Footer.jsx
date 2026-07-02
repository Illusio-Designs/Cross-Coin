import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AiOutlineMail } from "react-icons/ai";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { MdOutlinePhoneInTalk } from "react-icons/md";
import SafeImage from "../common/SafeImage";
import { getPublicCategories } from "../../services/publicApi";
import { collectionUrl } from "../../utils/collectionUrl";

const Footer = () => {
  const [categories, setCategories] = useState([]);
  const [email, setEmail] = useState("");
  const [year, setYear] = useState(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getPublicCategories();
        if (Array.isArray(data)) setCategories(data.slice(0, 8));
        else if (data && Array.isArray(data.categories)) setCategories(data.categories.slice(0, 8));
      } catch { setCategories([]); }
    };
    fetchCategories();
  }, []);

  const handleNewsletterSubmit = (e) => { e.preventDefault(); setEmail(""); };

  return (
    <footer className="footer">

      {/* Newsletter Banner */}
      <div className="footer__newsletter">
        <div className="footer__newsletter-inner">
          <div className="footer__newsletter-text">
            <h3>Be the First to Know</h3>
            <p>Exclusive offers, new arrivals and insider updates — straight to your inbox.</p>
          </div>
          <form className="footer__newsletter-form" onSubmit={handleNewsletterSubmit}>
            <input type="email" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </div>

      {/* Categories strip */}
      {categories.length > 0 && (
        <div className="footer__categories">
          <span className="footer__categories-label">Popular Searches</span>
          <div className="footer__categories-links">
            {categories.map((cat) => (
              <Link key={cat.id} href={collectionUrl(cat)} className="footer__cat-link">
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="footer__main">

        {/* Brand col */}
        <div className="footer__col footer__brand">
          <div className="footer__logo">
            <SafeImage
              imageData={{ image_url: "/assets/crosscoin_logo.webp" }}
              alt="CrossCoin Logo"
              width={140} height={56} quality={90}
              style={{ objectFit: 'contain' }}
              isLogo={true}
            />
          </div>
          <p className="footer__brand-desc">Premium quality socks designed for comfort and style. Join our community for exclusive deals.</p>
          <div className="footer__social-icons">
            <a href="https://www.facebook.com/people/Cross-Coin/61577195743730/" className="social-icon" aria-label="Facebook" target="_blank" rel="noopener noreferrer"><FaFacebookF /></a>
            <a href="https://www.instagram.com/crosscoin99/?igsh=d2FiY29iemhtb2Nl" className="social-icon" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
            <a href="https://wa.me/917434834000" className="social-icon" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer"><FaWhatsapp /></a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer__col">
          <h4>Quick Links</h4>
          <ul>
            <li><Link href="/About">About Us</Link></li>
            <li><Link href="/Collections">Collections</Link></li>
            <li><Link href="/Products">All Products</Link></li>
            <li><Link href="/Contact">Contact Us</Link></li>
          </ul>
        </div>

        {/* Account */}
        <div className="footer__col">
          <h4>Account</h4>
          <ul>
            <li><Link href="/profile">My Account</Link></li>
            <li><Link href="/OrderTracking">Track Order</Link></li>
            <li><Link href="/Wishlist">Wishlist</Link></li>
          </ul>
        </div>

        {/* Policy */}
        <div className="footer__col">
          <h4>Policies</h4>
          <ul>
            <li><Link href="/policy/privacy-policy">Privacy Policy</Link></li>
            <li><Link href="/policy/terms-and-conditions">Terms & Conditions</Link></li>
            <li><Link href="/policy/shipping-policy">Shipping Policy</Link></li>
            <li><Link href="/policy/cancellation-and-refund">Cancellation & Refund</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div className="footer__col">
          <h4>Contact Us</h4>
          <div className="footer__contact">
            <div className="contact-item">
              <MdOutlinePhoneInTalk className="contact-icon" />
              <div>
                <p className="contact-label">Mon–Fri, 24 Hours</p>
                <a href="tel:+917434834000" className="contact-link">+91 74348 34000</a>
              </div>
            </div>
            <div className="contact-item">
              <AiOutlineMail className="contact-icon" />
              <div>
                <p className="contact-label">Email Support</p>
                <a href="mailto:info@crosscoin.in" className="contact-link">info@crosscoin.in</a>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom bar */}
      <div className="footer__bottom">
        <span className="footer__copyright">© {year ?? ''} CrossCoin. All rights reserved.</span>
        <span className="footer__credit">
          Crafted with <span role="img" aria-label="love">❤️</span> by&nbsp;
          <a href="https://illusiodesigns.agency/" target="_blank" rel="noopener noreferrer">Illusio Designs</a>
        </span>
      </div>

    </footer>
  );
};

export default Footer;
