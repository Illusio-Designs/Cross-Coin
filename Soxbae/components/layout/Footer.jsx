import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import Icon from '@/components/Icon';

const COLS = [
  { title: 'Shop', links: [
    { label: 'All socks', href: '/products' },
    { label: 'Collections', href: '/collections' },
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Track order', href: '/track-order' },
  ] },
  { title: 'Company', links: [
    { label: 'About', href: '/about' },
    { label: 'Journal', href: '/journal' },
    { label: 'Contact', href: '/contact' },
    { label: 'My account', href: '/account' },
  ] },
  { title: 'Support', links: [
    { label: 'Shipping & delivery', href: '/policies/shipping-policy' },
    { label: 'Cancellation & refund', href: '/policies/cancellation-and-refund' },
    { label: 'Privacy policy', href: '/policies/privacy-policy' },
    { label: 'Terms of service', href: '/policies/terms-and-conditions' },
  ] },
];

export default function Footer() {
  return (
    <footer className="sx-footer">
      <div className="container">
        <div className="sx-footer-top">
          <div className="sx-footer-intro">
            <Link href="/" className="sx-footer-logo" aria-label="Soxbae home"><BrandLogo height={34} /></Link>
            <p className="sx-footer-tag">Considered socks — cushioned, breathable and made to last, for sport, street and everything between.</p>
            <div className="sx-footer-social">
              <a href="https://www.instagram.com/soxbaesocks" target="_blank" rel="noopener noreferrer" aria-label="Soxbae on Instagram"><Icon name="Instagram" size={18} /></a>
              <a href="https://www.facebook.com/profile.php?id=61587402929566" target="_blank" rel="noopener noreferrer" aria-label="Soxbae on Facebook"><Icon name="Facebook" size={18} /></a>
              <a href="https://wa.me/917434834000" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><Icon name="WhatsApp" size={18} /></a>
            </div>
          </div>
          <div className="sx-footer-cols">
            {COLS.map((col) => (
              <div className="sx-footer-col" key={col.title}>
                <h4>{col.title}</h4>
                <ul>{col.links.map((l) => <li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}</ul>
              </div>
            ))}
            <div className="sx-footer-col">
              <h4>Contact</h4>
              <ul className="sx-footer-contact">
                <li><a href="tel:+919712891700"><Icon name="Phone" size={15} /><span>+91 97128 91700</span></a></li>
                <li><a href="mailto:obzusindia@gmail.com"><Icon name="Mail" size={15} /><span>obzusindia@gmail.com</span></a></li>
                <li><Icon name="MapPin" size={15} /><span>Royal Plaza, Panchasar Road, Morbi 363641, Gujarat, India</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="sx-footer-bottom">
          <span>© {new Date().getFullYear()} Soxbae — Happiness in feet</span>
          <span>Made by <a href="https://finvera.solutions" target="_blank" rel="noopener noreferrer">Finvera.solutions</a></span>
        </div>
      </div>
    </footer>
  );
}
