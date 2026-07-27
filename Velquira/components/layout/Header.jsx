import Link from 'next/link';
import Icon from '@/components/Icon';
import BrandLogo from '@/components/BrandLogo';
import CartButton from './CartButton';
import WishlistLink from './WishlistLink';
import MobileNav from './MobileNav';

const NAV = [
  { label: 'Shop', href: '/products' },
  { label: 'Collections', href: '/collections' },
  { label: 'Journal', href: '/journal' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

// Velquira maison header — a tiered luxury layout: an announcement ribbon, a
// centred logo flanked by utilities, and a centred nav rule below. Structurally
// distinct from a single-row storefront header.
export default function Header() {
  return (
    <header className="header vq-header">
      <div className="vq-annc">
        Complimentary insured shipping <b>✦</b> Book a private appointment <b>✦</b> Handcrafted in Morbi
      </div>

      <div className="container vq-header-main">
        <div className="vq-header-left">
          <MobileNav items={NAV} />
          <Link href="/search" className="vq-hicon vq-desk" aria-label="Search"><Icon name="Search" size={17} /></Link>
          <span className="vq-desk"><WishlistLink /></span>
        </div>

        <Link href="/" className="vq-logo" aria-label="Velquira home">
          <BrandLogo height={46} />
        </Link>

        <div className="vq-header-right">
          <Link href="/account" className="vq-hicon vq-desk" aria-label="Account"><Icon name="User" size={17} /></Link>
          <CartButton />
        </div>
      </div>

      <nav className="vq-nav container">
        {NAV.map((item) => (
          <Link key={item.label} href={item.href}>{item.label}</Link>
        ))}
      </nav>
    </header>
  );
}
