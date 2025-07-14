import React, { useEffect, useState } from "react";
import { AiOutlineMail } from "react-icons/ai";
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { MdOutlinePhoneInTalk } from "react-icons/md"; 
import Image from "next/image";
import { getPublicCategories } from "../services/publicindex";

const Footer = () => {
  const [collections, setCollections] = useState([]);

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
          <p>Register now to get latest updates on promotions & coupons. Don't worry, we not spam!</p>
          <div className="footer__social">
            <h2>Follow us on social media:</h2>
            <div className="footer__social-icons">
            <a href="#" className="facebook" aria-label="Facebook"><FaFacebookF /></a>
            <a href="#" className="instagram" aria-label="Instagram"><FaInstagram /></a>
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
          <p>It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.</p>
          <div className="footer__contact">
            <div className="contact-item"><MdOutlinePhoneInTalk /> <span className="gap">Monday - Friday: 8:00 AM - 9:00 PM<br /><b className="bold">+91 9712891700 </b></span></div> 
            <div className="contact-item"><AiOutlineMail /> <span className="gap">Need help with your order?<br /><b className="bold">Crosscoinindia@gmail.com</b></span></div>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="footer__copyright">
          Copyright 2025 &copy; crosscoin Manage by OBZUS INDIA PRIVATE LIMITED. All right reserved
        </div>
       
        <div className="footer__links">
          <a href="/policy?name=terms-and-conditions">Terms and Conditions</a>
          <a href="/policy?name=privacy-policy">Privacy Policy</a>
          <a href="/policy?name=shipping-policy">Shipping Policy</a>
          <a href="/policy?name=cancellation-and-refund">Cancellation & Refund</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 