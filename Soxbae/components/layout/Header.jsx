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

// Soxbae header — a NEW structure (not Morbix's centered-nav row):
// a black announcement ticker on top, then a bar with the logo + LEFT-aligned
// nav, and a solid orange "Cart" button anchoring the right.
export default function Header() {
  return (
    <header className="sox-header">
      <div className="sox-annc">
        <span>Free shipping over ₹499</span><b>◆</b>
        <span>Happiness in Feet</span><b>◆</b>
        <span>15-day easy returns</span>
      </div>
      <div className="sox-bar container">
        <div className="sox-bar-l">
          <MobileNav items={NAV} />
          <Link href="/" className="sox-logo" aria-label="Soxbae home"><BrandLogo height={34} /></Link>
        </div>
        <nav className="sox-nav">
          {NAV.map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className="sox-bar-r">
          <Link href="/search" className="sox-icon" aria-label="Search"><Icon name="Search" size={18} /></Link>
          <WishlistLink />
          <Link href="/account" className="sox-icon" aria-label="Account"><Icon name="User" size={18} /></Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
