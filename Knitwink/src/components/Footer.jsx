import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="newsletter">
        <div className="container">
          <div className="newsletterContent">
            <div className="newsletterText">
              <h3 className="newsletterTitle">Join Our Community</h3>
              <p className="newsletterDescription">
                Get exclusive offers, new arrivals, and style inspiration
              </p>
            </div>
            <form className="newsletterForm">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="newsletterInput"
                required
              />
              <button type="submit" className="btn btn-primary">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="footerMain">
        <div className="container">
          <div className="footerGrid">
            <div className="footerColumn">
              <Link href="/" className="footerLogo">
                <Image 
                  src="/assets/Knitwink.jpg.jpeg" 
                  alt="Knitwink" 
                  width={140} 
                  height={45}
                  style={{ objectFit: 'contain' }}
                />
              </Link>
              <p className="footerBrand">
                Premium comfort in every step. Handcrafted socks made with the finest materials.
              </p>
              <div className="socialLinks">
                <a href="https://facebook.com" className="socialLink" aria-label="Facebook">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                </a>
                <a href="https://instagram.com" className="socialLink" aria-label="Instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
                <a href="https://twitter.com" className="socialLink" aria-label="Twitter">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                  </svg>
                </a>
                <a href="https://pinterest.com" className="socialLink" aria-label="Pinterest">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 4.26 2.68 7.9 6.44 9.34-.09-.8-.17-2.03.03-2.91.19-.78 1.23-5.22 1.23-5.22s-.31-.63-.31-1.56c0-1.46.85-2.55 1.9-2.55.9 0 1.33.67 1.33 1.48 0 .9-.57 2.25-.87 3.5-.25 1.04.52 1.89 1.55 1.89 1.86 0 3.29-1.96 3.29-4.79 0-2.5-1.8-4.25-4.37-4.25-2.98 0-4.73 2.23-4.73 4.54 0 .9.35 1.86.78 2.38.09.1.1.19.07.3-.08.31-.25 1.04-.29 1.18-.05.19-.17.23-.39.14-1.39-.65-2.26-2.68-2.26-4.31 0-3.51 2.55-6.73 7.36-6.73 3.87 0 6.87 2.76 6.87 6.44 0 3.84-2.42 6.93-5.78 6.93-1.13 0-2.19-.59-2.55-1.28l-.69 2.64c-.25.97-.93 2.19-1.39 2.93C9.58 21.85 10.77 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className="footerColumn">
              <h4 className="footerTitle">Shop</h4>
              <ul className="footerLinks">
                <li><Link href="/shop">All Products</Link></li>
                <li><Link href="/collections/men">Men's Collection</Link></li>
                <li><Link href="/collections/women">Women's Collection</Link></li>
                <li><Link href="/collections/kids">Kids Collection</Link></li>
              </ul>
            </div>

            <div className="footerColumn">
              <h4 className="footerTitle">Customer Service</h4>
              <ul className="footerLinks">
                <li><Link href="/contact">Contact Us</Link></li>
                <li><Link href="/faq">FAQ</Link></li>
                <li><Link href="/account">My Account</Link></li>
              </ul>
            </div>

            <div className="footerColumn">
              <h4 className="footerTitle">Company</h4>
              <ul className="footerLinks">
                <li><Link href="/about">About Us</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms & Conditions</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="footerBottom">
        <div className="container">
          <div className="footerBottomContent">
            <p className="copyright">
              © 2026 Knitwink. All rights reserved.
            </p>
            <p className="credit">
              Design & Develop with <span className="heart">❤️</span> by{' '}
              <a href="https://illusiodesigns.agency/" target="_blank" rel="noopener noreferrer">
                Illusio Designs
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
