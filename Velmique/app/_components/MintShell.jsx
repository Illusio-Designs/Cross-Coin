'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import BrandIcon from '@/components/ui/BrandIcon';
import CookieSettingsButton from '@/components/ui/CookieSettingsButton';

const I = Object.fromEntries(['menu', 'close', 'search', 'user', 'bag'].map(name => [name, <BrandIcon key={name} name={name} />]));

const NAV = [
  { label: 'Shop', href: '/shop' },
  { label: 'Collections', href: '/collections' },
  { label: 'Build a Pack', href: '/pack' },
];
// Extra destinations in the mobile slide-nav (desktop reaches them via icons).
const MNAV_EXTRA = [
  { label: 'Search', href: '/search' },
  { label: 'Wishlist', href: '/wishlist' },
  { label: 'My Account', href: '/account' },
  { label: 'Track Order', href: '/track-order' },
];

const ANNO = [
  { text: 'Discover your everyday signature', icon: 'perfume' },
  { text: 'Crafted in India', icon: 'flag' },
  { text: 'Easy 7-day returns', icon: 'returns' },
  { text: '100% genuine fragrances', icon: 'verified' },
  { text: 'Cash on delivery available', icon: 'cash' },
];
function AnnouncementBar() {
  const viewportRef = useRef(null);
  const sequenceRef = useRef(null);
  const [copies, setCopies] = useState(3);

  useEffect(() => {
    const viewport = viewportRef.current;
    const sequence = sequenceRef.current;
    const fillViewport = () => {
      const width = sequence.getBoundingClientRect().width;
      if (width) setCopies(Math.max(3, Math.ceil(viewport.clientWidth / width) + 1));
    };
    const observer = new ResizeObserver(fillViewport);
    observer.observe(viewport);
    observer.observe(sequence);
    fillViewport();
    return () => observer.disconnect();
  }, []);

  return (
    <div className="v-announcement" role="region" aria-label="Store announcements">
      <div className="v-announcement__viewport" ref={viewportRef} tabIndex={0}>
        <div className="v-announcement__track" style={{ '--announcement-copies': copies }}>
          {Array.from({ length: copies }, (_, index) => (
            <div className="v-announcement__items" key={index} ref={index === 0 ? sequenceRef : null}
              aria-hidden={index > 0 || undefined}>
              {ANNO.map(({ text, icon }) => (
                <span className="v-announcement__item" key={text}>
                  <BrandIcon name={icon} size={16} />
                  {text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Brand({ className = '' }) {
  return (
    <Link href="/" className={`m-logo-link ${className}`} aria-label="Velmique">
      <span className="m-logo" aria-hidden="true" />
    </Link>
  );
}

export default function MintShell({ children }) {
  // The bag itself is the CartDrawer mounted in the root layout; the shell
  // only opens it and shows the count.
  const { cartCount, setCartOpen } = useStore();
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();

  // Close the slide-nav on navigation and on Escape; lock page scroll while open.
  useEffect(() => { setMenu(false); }, [pathname]);
  useEffect(() => {
    if (!menu) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [menu]);

  return (
    <>
      <AnnouncementBar />

      <header className="m-header">
        <div className="m-wrap m-nav">
          <button className="m-burger" aria-label="Open menu" aria-expanded={menu} aria-controls="m-mnav" onClick={() => setMenu(true)}>{I.menu}</button>
          <nav className="m-nav__links" aria-label="Primary">
            {NAV.map((n) => <Link key={n.label} className="m-lnk" href={n.href}>{n.label}</Link>)}
          </nav>
          <Brand />
          <div className="m-icons">
            <Link href="/search" aria-label="Search">{I.search}</Link>
            <Link href="/wishlist" aria-label="Wishlist"><BrandIcon name="heart" /></Link>
            <Link href="/account" aria-label="Account">{I.user}</Link>
            <button className="m-bag" aria-label={`Open bag, ${cartCount} item${cartCount === 1 ? '' : 's'}`} onClick={() => setCartOpen(true)}>{I.bag}<b aria-hidden="true">{cartCount}</b></button>
          </div>
        </div>
      </header>

      {/* mobile slide-nav */}
      <div id="m-mnav" className={`m-mnav ${menu ? 'on' : ''}`} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!menu} inert={menu ? undefined : ''}>
        <button className="m-mnav__x" aria-label="Close menu" onClick={() => setMenu(false)}>{I.close}</button>
        <Brand className="v-mobile-logo" />
        {NAV.map((n) => <Link key={n.label} href={n.href} onClick={() => setMenu(false)}>{n.label}</Link>)}
        {MNAV_EXTRA.map((n) => <Link key={n.label} className="m-mnav__sub" href={n.href} onClick={() => setMenu(false)}>{n.label}</Link>)}
      </div>

      <main id="main">{children}</main>

      {/* ── Footer ── */}
      <footer className="m-footer">
        <div className="m-wrap">
          <div className="m-foot">
            <div className="m-foot__brand">
              <Brand className="m-foot__logo" />
              <p>Maison de Parfum — fragrances for a more intentional you.</p>
              <div className="m-social" aria-label="Social links">
                <a href="https://www.instagram.com/velmique_perfume/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><BrandIcon name="instagram" size={19}/></a>
                <a href="https://www.facebook.com/profile.php?id=61589512171604" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><BrandIcon name="facebook" size={19}/></a>
              </div>
              <ul className="m-foot__contact">
                <li><a href="mailto:obzusindia@gmail.com">obzusindia@gmail.com</a></li>
                <li><a href="tel:+919712891700">+91 97128 91700</a></li>
              </ul>
            </div>
            <div>
              <h4>Shop</h4>
              <ul>
                <li><Link href="/shop">All Fragrances</Link></li>
                <li><Link href="/collections">Collections</Link></li>
                <li><Link href="/pack">Build a Pack</Link></li>
                <li><Link href="/wishlist">Wishlist</Link></li>
              </ul>
            </div>
            <div>
              <h4>About</h4>
              <ul>
                <li><Link href="/about">Our Story</Link></li>
                <li><Link href="/journal">Journal</Link></li>
                <li><Link href="/account">My Account</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4>Customer Care</h4>
              <ul>
                <li><Link href="/track-order">Track Order</Link></li>
                <li><Link href="/account/returns">Returns &amp; Refunds</Link></li>
                <li><Link href="/shipping-returns">Shipping Policy</Link></li>
                <li><Link href="/cancellation-refund">Cancellation &amp; Refund</Link></li>
              </ul>
            </div>
          </div>
          <div className="m-legal">
            <span>© {new Date().getFullYear()} VELMIQUE. All rights reserved.</span>
            <span><Link href="/privacy-policy">Privacy Policy</Link><Link href="/terms">Terms Of Use</Link><Link href="/contact#grievance">Grievance</Link><CookieSettingsButton className="m-legal__cookie" /></span>
            <span className="m-legal__by">Made with <em>❤</em> by <a href="https://finvera.solutions" target="_blank" rel="noopener noreferrer">Finvera.solutions</a></span>
          </div>
        </div>
      </footer>
    </>
  );
}
