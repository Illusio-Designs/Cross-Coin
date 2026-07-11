import Link from 'next/link';
import Icon from '@/components/Icon';
import CartButton from './CartButton';
import MobileNav from './MobileNav';

const NAV = [
  { label: 'Catalog', href: '/catalog' },
  { label: 'Running', href: '/catalog?cat=running' },
  { label: 'Athletic', href: '/catalog?cat=athletic' },
  { label: 'Compression', href: '/catalog?cat=compression' },
  { label: 'Lifestyle', href: '/catalog?cat=lifestyle' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <MobileNav items={NAV} />

        <Link href="/" className="logo" aria-label="Morbix home">
          <div>
            <div className="logo-mark"><span className="m">M</span><span className="rest">orbix</span></div>
            <div className="logo-sub">Comfort in every step</div>
          </div>
        </Link>

        <nav className="nav">
          {NAV.map((item) => (
            <Link key={item.label} href={item.href}>{item.label}</Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link href="/account" className="pill sign-in"><Icon name="User" size={16} /> <span>Sign in</span></Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
