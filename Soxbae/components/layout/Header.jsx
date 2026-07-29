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

export default function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <MobileNav items={NAV} />

        <Link href="/" className="logo" aria-label="Soxbae home">
          <BrandLogo height={38} />
        </Link>

        <nav className="nav">
          {NAV.map((item) => (
            <Link key={item.label} href={item.href}>{item.label}</Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link href="/search" className="pill icon-pill" aria-label="Search"><Icon name="Search" size={16} /></Link>
          <WishlistLink />
          <Link href="/account" className="pill sign-in"><Icon name="User" size={16} /> <span>Sign in</span></Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
