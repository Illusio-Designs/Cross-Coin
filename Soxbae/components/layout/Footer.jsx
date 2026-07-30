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
            <Link href="/products" className="sx-footer-shop">Shop all socks <Icon name="ArrowRight" size={15} /></Link>
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
                <li><a href="tel:+919712891700">+91 97128 91700</a></li>
                <li><a href="mailto:support@soxbaesocks.com">support@soxbaesocks.com</a></li>
                <li>Royal Plaza, Panchasar Road,<br />Morbi 363641, Gujarat, India</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="sx-footer-word" aria-hidden>Soxbae</div>

        <div className="sx-footer-bottom">
          <span>© {new Date().getFullYear()} Soxbae — Happiness in feet</span>
          <div className="sx-footer-social">
            <a href="https://www.instagram.com/crosscoin99/?igsh=d2FiY29iemhtb2Nl" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon name="Instagram" size={18} /></a>
            <a href="https://www.facebook.com/people/Cross-Coin/61577195743730/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Icon name="Facebook" size={18} /></a>
            <a href="https://wa.me/919712891700" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><Icon name="WhatsApp" size={18} /></a>
          </div>
          <span>Made by <a href="https://finvera.solutions" target="_blank" rel="noopener noreferrer">Finvera.solutions</a></span>
        </div>
      </div>
    </footer>
  );
}
