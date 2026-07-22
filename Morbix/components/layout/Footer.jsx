import Link from 'next/link';
import Icon from '@/components/Icon';
import MorbixLogo from '@/components/MorbixLogo';

const COLS = [
  { title: 'Shop', links: [
    { label: 'All socks', href: '/products' },
    { label: 'Collections', href: '/collections' },
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Track order', href: '/track-order' },
  ] },
  { title: 'For buyers', links: [
    { label: 'Shipping & delivery', href: '/policies/shipping' },
    { label: 'Returns & exchange', href: '/policies/returns' },
    { label: 'Privacy policy', href: '/policies/privacy' },
    { label: 'Terms of service', href: '/policies/terms' },
  ] },
  { title: 'Company', links: [
    { label: 'About', href: '/about' },
    { label: 'Journal', href: '/journal' },
    { label: 'Contact', href: '/contact' },
    { label: 'My account', href: '/account' },
  ] },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-cols">
          <div className="brand-col">
            <MorbixLogo height={34} />
            <p>Premium socks for sport and city life. Technology, comfort and clean design in every step.</p>
            <div className="socials">
              <a href="#" aria-label="Instagram"><Icon name="Instagram" size={18} /></a>
              <a href="#" aria-label="Facebook"><Icon name="Facebook" size={18} /></a>
              <a href="#" aria-label="YouTube"><Icon name="Youtube" size={18} /></a>
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>{col.links.map((l) => <li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}</ul>
            </div>
          ))}

          <div>
            <h4>Contacts</h4>
            <ul className="footer-contacts">
              <li><a href="tel:+919712891700"><Icon name="Phone" size={15} /><span>+91 97128 91700</span></a></li>
              <li><a href="mailto:support@morbixsocks.com"><Icon name="Mail" size={15} /><span>support@morbixsocks.com</span></a></li>
              <li><span className="footer-addr"><Icon name="MapPin" size={15} /><span>Royal Plaza, Panchasar Road, Morbi - 363641, Gujarat, India</span></span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Morbix. All rights reserved.</span>
          <span className="footer-credit">Made with <span aria-label="love">❤</span> by <a href="https://finvera.solutions" target="_blank" rel="noopener noreferrer">Finvera.solutions</a></span>
          <span style={{ display: 'flex', gap: 20 }}>
            <Link href="/policies/privacy">Privacy policy</Link>
            <Link href="/policies/terms">Terms of service</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
