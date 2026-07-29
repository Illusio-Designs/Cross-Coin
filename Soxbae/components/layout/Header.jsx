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

// Soxbae header — refined editorial layout: a slim understated announcement
// line, then a clean three-column bar (logo left · centred nav · minimal icons)
// with a thin hairline underline. Orange is used only as a small accent.
export default function Header() {
  return (
    <header className="shx-header">
      <div className="shx-annc">
        <span>Free shipping over ₹499</span>
        <span className="shx-dot" aria-hidden>—</span>
        <span>Happiness in Feet</span>
        <span className="shx-dot" aria-hidden>—</span>
        <span>15-day easy returns</span>
      </div>
      <div className="shx-bar container">
        <div className="shx-left">
          <MobileNav items={NAV} />
          <Link href="/" className="shx-logo" aria-label="Soxbae home"><BrandLogo height={30} /></Link>
        </div>
        <nav className="shx-nav">
          {NAV.map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className="shx-actions">
          <Link href="/search" className="shx-icon" aria-label="Search"><Icon name="Search" size={18} /></Link>
          <span className="shx-desk"><WishlistLink /></span>
          <Link href="/account" className="shx-icon shx-desk" aria-label="Account"><Icon name="User" size={18} /></Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
