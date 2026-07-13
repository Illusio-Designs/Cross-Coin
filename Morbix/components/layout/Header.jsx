import Link from 'next/link';
import Icon from '@/components/Icon';
import MorbixLogo from '@/components/MorbixLogo';
import CartButton from './CartButton';
import MobileNav from './MobileNav';

const NAV = [
  { label: 'Shop', href: '/catalog' },
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
            <MorbixLogo height={30} />
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
