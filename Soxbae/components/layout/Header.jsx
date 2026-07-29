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

// Soxbae header — a BOXED / FRAMED structure (unique to Soxbae): the nav lives
// inside an outlined segmented pill, the utility icons are individual outlined
// square buttons, and the cart is a solid ink box. Architectural + tactile.
export default function Header() {
  return (
    <header className="sx-hd">
      <div className="sx-ticker" aria-hidden="true">
        <div className="sx-ticker-track">
          {/* Four identical runs so one repeat unit (half the track) is always
              wider than the viewport — the -50% loop never shows a gap. */}
          {Array.from({ length: 4 }).map((_, r) => (
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
        <div className="sx-hd-l">
          <MobileNav items={NAV} />
          <Link href="/" className="sx-hd-logo" aria-label="Soxbae home"><BrandLogo height={32} /></Link>
        </div>

        <nav className="sx-navbox sx-hd-desk">
          {NAV.map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}
        </nav>

        <div className="sx-hd-r">
          <Link href="/search" className="sx-hd-box sx-hd-desk" aria-label="Search"><Icon name="Search" size={17} /></Link>
          <span className="sx-hd-desk"><WishlistLink /></span>
          <Link href="/account" className="sx-hd-box sx-hd-desk" aria-label="Account"><Icon name="User" size={17} /></Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
