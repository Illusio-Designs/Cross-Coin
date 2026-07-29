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

// Soxbae header — premium editorial layout: a slim centred announcement line,
// a centred wordmark flanked by search (left) and account/wishlist/cart (right),
// then a centred nav row under a hairline. Calm, spacious, gallery-like.
export default function Header() {
  return (
    <header className="sx-hd">
      <div className="sx-annc">
        <span>Free shipping over ₹499</span>
        <em>·</em>
        <span>Happiness in feet</span>
        <em>·</em>
        <span>15-day easy returns</span>
      </div>

      <div className="sx-hd-main container">
        <div className="sx-hd-side sx-hd-left">
          <MobileNav items={NAV} />
          <Link href="/search" className="sx-hd-ic sx-hd-desk" aria-label="Search"><Icon name="Search" size={18} /></Link>
        </div>

        <Link href="/" className="sx-hd-logo" aria-label="Soxbae home"><BrandLogo height={32} /></Link>

        <div className="sx-hd-side sx-hd-right">
          <span className="sx-hd-desk"><WishlistLink /></span>
          <Link href="/account" className="sx-hd-ic sx-hd-desk" aria-label="Account"><Icon name="User" size={18} /></Link>
          <CartButton />
        </div>
      </div>

      <nav className="sx-hd-nav container">
        {NAV.map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}
      </nav>
    </header>
  );
}
