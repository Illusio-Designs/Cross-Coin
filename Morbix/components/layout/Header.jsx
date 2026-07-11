import Link from 'next/link';
import Icon from '@/components/Icon';

const NAV = ['Catalog', 'Brands', 'New', 'Sale', 'Technology', 'About', 'Delivery'];

export default function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo" aria-label="Morbix home">
          <div>
            <div className="logo-mark"><span className="m">M</span><span className="rest">orbix</span></div>
            <div className="logo-sub">Comfort in every step</div>
          </div>
        </Link>

        <nav className="nav">
          {NAV.map((item) => (
            <Link key={item} href="#">{item}</Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link href="#" className="pill"><Icon name="User" size={16} /> Sign in</Link>
          <Link href="#" className="pill cart"><Icon name="ShoppingBag" size={16} /> Cart <span className="badge">0</span></Link>
        </div>
      </div>
    </header>
  );
}
