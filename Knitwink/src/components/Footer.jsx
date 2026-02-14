import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="footer">
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
                Premium comfort in every step.
              </p>
            </div>

            <div className="footerColumn">
              <h4 className="footerTitle">Shop</h4>
              <ul className="footerLinks">
                <li><Link href="/shop">All Products</Link></li>
                <li><Link href="/collections/men">Men</Link></li>
                <li><Link href="/collections/women">Women</Link></li>
                <li><Link href="/collections/kids">Kids</Link></li>
              </ul>
            </div>

            <div className="footerColumn">
              <h4 className="footerTitle">Company</h4>
              <ul className="footerLinks">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/faq">FAQ</Link></li>
              </ul>
            </div>

            <div className="footerColumn">
              <h4 className="footerTitle">Legal</h4>
              <ul className="footerLinks">
                <li><Link href="/privacy">Privacy</Link></li>
                <li><Link href="/terms">Terms</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="footerBottom">
        <div className="container">
          <div className="footerBottomContent">
            <p className="copyright">
              © {new Date().getFullYear()} Knitwink. All rights reserved.
            </p>
            <p className="footerCredit">
              Design & Develop with <span role="img" aria-label="love">❤️</span> by - 
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
