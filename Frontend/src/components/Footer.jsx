import React, { useEffect, useState } from "react";
import { AiOutlineMail } from "react-icons/ai";
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { MdOutlinePhoneInTalk } from "react-icons/md"; 
import Image from "next/image";
import { getPublicCategories } from "../services/publicindex";

const Footer = () => {
  const [collections, setCollections] = useState([]);
  const [hoveredLink, setHoveredLink] = useState(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const data = await getPublicCategories();
        // Handle both array and object response
        if (Array.isArray(data)) {
          setCollections(data.slice(0, 5));
        } else if (data && Array.isArray(data.categories)) {
          setCollections(data.categories.slice(0, 5));
        } else {
          setCollections([]);
        }
      } catch (error) {
        setCollections([]);
      }
    };
    fetchCollections();
  }, []);

  return (
    <footer className="footer">
      <div className="footer__main">
        <div className="footer__col footer__brand">
          <div className="footer__logo">
            <span className="footer__logo">
            <Image src="/assets/crosscoin_logo.webp" alt="logo" width={120} height={40} unoptimized />
            </span>
          </div>
          <p>Discover premium quality socks designed for comfort and style. Join our community for exclusive deals, new arrivals, and special offers on your favorite Cross Coin collections!</p>
          <div className="footer__social">
            <h2>Follow us on social media:</h2>
            <div className="footer__social-icons">
            <a href="https://www.facebook.com/people/Cross-Coin/61577195743730/" className="facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer"><FaFacebookF /></a>
            <a href="https://www.instagram.com/crosscoin99/?igsh=d2FiY29iemhtb2Nl" className="instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
            </div>
          </div>
        </div>
        <div className="footer__col">
          <h4>Popular Collections</h4>
          <ul>
            {collections.map((col) => (
              <li key={col.id}>{col.name}</li>
            ))}
          </ul>
        </div>
        <div className="footer__col footer__help">
          <h4>Do You Need Help ?</h4>
          <p>Our customer support team is here to assist you with orders, product inquiries, and any questions about our premium sock collections. Reach out anytime!</p>
          <div className="footer__contact">
            <div className="contact-item">
              <MdOutlinePhoneInTalk /> 
              <span className="gap">
                Monday - Friday: 8:00 AM - 9:00 PM<br />
                <a 
                  href="tel:+919712891700" 
                  className="contact-link"
                  title="Click to call +91 9712891700"
                  onMouseEnter={() => setHoveredLink('phone')}
                  onMouseLeave={() => setHoveredLink(null)}
                  style={{
                    textDecoration: 'none',
                    color: hoveredLink === 'phone' ? '#d32f2f' : '#111827',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'inline-block',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    backgroundColor: hoveredLink === 'phone' ? 'rgba(211, 47, 47, 0.1)' : 'transparent',
                    transform: hoveredLink === 'phone' ? 'translateY(-1px)' : 'translateY(0)'
                  }}
                >
                  <b className="bold" style={{ color: hoveredLink === 'phone' ? '#d32f2f' : 'inherit' }}>+91 9712891700</b>
                </a>
              </span>
            </div> 
            <div className="contact-item">
              <AiOutlineMail /> 
              <span className="gap">
                Need help with your order?<br />
                <a 
                  href="mailto:Crosscoinindia@gmail.com" 
                  className="contact-link"
                  title="Click to send email to Crosscoinindia@gmail.com"
                  onMouseEnter={() => setHoveredLink('email')}
                  onMouseLeave={() => setHoveredLink(null)}
                  style={{
                    textDecoration: 'none',
                    color: hoveredLink === 'email' ? '#d32f2f' : '#111827',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'inline-block',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    backgroundColor: hoveredLink === 'email' ? 'rgba(211, 47, 47, 0.1)' : 'transparent',
                    transform: hoveredLink === 'email' ? 'translateY(-1px)' : 'translateY(0)'
                  }}
                >
                  <b className="bold" style={{ color: hoveredLink === 'email' ? '#d32f2f' : 'inherit' }}>Crosscoinindia@gmail.com</b>
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <span className="footer__copyright">
          Copyright 2025 &copy; CrossCoin Manage by OBZUS INDIA PRIVATE LIMITED. All right reserved
        </span>
        <span className="footer__credit">
          Design & Develop with <span role="img" aria-label="love">❤️️</span> by - 
          <a href="https://illusiodesigns.agency/" target="_blank" rel="noopener noreferrer">
            Illusio Designs
          </a>
        </span>
      </div>
      <div className="footer__links">
        <a href="/policy?name=terms-and-conditions">Terms and Conditions</a>
        <a href="/policy?name=privacy-policy">Privacy Policy</a>
        <a href="/policy?name=shipping-policy">Shipping Policy</a>
        <a href="/policy?name=cancellation-and-refund">Cancellation & Refund</a>
      </div>
    </footer>
  );
};

export default Footer; 