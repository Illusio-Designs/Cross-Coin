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

// Soxbae header — a single-row SPLIT-NAV structure (unique to Soxbae, not the
// stacked centred-nav layout): the nav wraps around the centred wordmark —
// three links on the left, two links + the utility icons on the right — all in
// one line. A slim running-benefit strip sits above it.
const NAV_L = [
  { label: 'Shop', href: '/products' },
  { label: 'Collections', href: '/collections' },
  { label: 'Journal', href: '/journal' },
];
const NAV_R = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Header() {
  return (
    <header className="sx-hd">
      <div className="sx-ticker" aria-hidden="true">
        <div className="sx-ticker-track">
          {Array.from({ length: 2 }).map((_, r) => (
            <div className="sx-ticker-run" key={r}>
              <span>Free shipping over ₹499</span><i>✦</i>
              <span>Cushioned comfort knit</span><i>✦</i>
              <span>15-day easy returns</span><i>✦</i>
              <span>Happiness in feet</span><i>✦</i>
            </div>
          ))}
        </div>
      </div>

      <div className="sx-hd-row container">
        <nav className="sx-hd-nav sx-hd-nav-l">
          <MobileNav items={NAV} />
          {NAV_L.map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}
        </nav>

        <Link href="/" className="sx-hd-logo" aria-label="Soxbae home"><BrandLogo height={32} /></Link>

        <nav className="sx-hd-nav sx-hd-nav-r">
          {NAV_R.map((item) => <Link key={item.label} href={item.href} className="sx-hd-desk">{item.label}</Link>)}
          <span className="sx-hd-div sx-hd-desk" aria-hidden="true" />
          <Link href="/search" className="sx-hd-ic sx-hd-desk" aria-label="Search"><Icon name="Search" size={18} /></Link>
          <span className="sx-hd-desk"><WishlistLink /></span>
          <Link href="/account" className="sx-hd-ic sx-hd-desk" aria-label="Account"><Icon name="User" size={18} /></Link>
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
