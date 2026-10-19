'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import CookieSettingsButton from '@/components/ui/CookieSettingsButton';

const I = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  close:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 6l12 12M18 6 6 18"/></svg>,
  search:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>,
  user:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>,
  bag:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>,
};

const NAV = [
  { label: 'Shop', href: '/shop' },
  { label: 'Collections', href: '/collections' },
  { label: 'Build a Pack', href: '/pack' },
  { label: 'About', href: '/about' },
  { label: 'Journal', href: '/journal' },
];
// Extra destinations in the mobile slide-nav (desktop reaches them via icons).
const MNAV_EXTRA = [
  { label: 'Search', href: '/search' },
  { label: 'Wishlist', href: '/wishlist' },
  { label: 'My Account', href: '/account' },
  { label: 'Track Order', href: '/track-order' },
];

const ANNO = [
  { t: 'Free shipping on all orders', d: 'M3 7h11v8H3zM14 10h4l3 3v2h-7z' },
  { t: 'Crafted in India', d: 'M12 3c-3 3-6 3-6 3v6c0 5 6 9 6 9s6-4 6-9V6s-3 0-6-3Z' },
  { t: 'Easy 7-day returns', d: 'M3 12a9 9 0 1 0 3-6.7M3 4v4h4' },
  { t: '100% genuine fragrances', d: 'M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z' },
  { t: 'Cash on delivery available', d: 'M2.5 6h19v12h-19zM2.5 10h19' },
];
function AnnoSeq({ hidden = false }) {
  return (
    <div className="m-anno__seq" aria-hidden={hidden}>
      {ANNO.map((a, i) => (
        <span className="m-anno__i" key={i}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={a.d} /></svg>{a.t}
        </span>
      ))}
    </div>
  );
}

function Brand({ className = '', text = false }) {
  if (text) {
    return <Link href="/" className={`m-brand ${className}`}>VELMIQUE<small>MAISON DE PARFUM</small></Link>;
  }
  return (
    <Link href="/" className={`m-logo-link ${className}`} aria-label="Velmique">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.webp" alt="Velmique" className="m-logo" />
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
      <div className="m-anno"><div className="m-anno__track"><AnnoSeq /><AnnoSeq hidden /></div></div>

      <header className="m-header">
        <div className="m-wrap m-nav">
          <button className="m-burger" aria-label="Open menu" aria-expanded={menu} aria-controls="m-mnav" onClick={() => setMenu(true)}>{I.menu}</button>
          <nav className="m-nav__links" aria-label="Primary">
            {NAV.map((n) => <Link key={n.label} className="m-lnk" href={n.href}>{n.label}</Link>)}
          </nav>
          <Brand />
          <div className="m-icons">
            <Link href="/search" aria-label="Search">{I.search}</Link>
            <Link href="/wishlist" aria-label="Wishlist"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19.5 12.6 12 20l-7.5-7.4a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l1 1 1-1a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5Z" /></svg></Link>
            <Link href="/account" aria-label="Account">{I.user}</Link>
            <button className="m-bag" aria-label={`Open bag, ${cartCount} item${cartCount === 1 ? '' : 's'}`} onClick={() => setCartOpen(true)}>{I.bag}<b aria-hidden="true">{cartCount}</b></button>
          </div>
        </div>
      </header>

      {/* mobile slide-nav */}
      <div id="m-mnav" className={`m-mnav ${menu ? 'on' : ''}`} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!menu} inert={menu ? undefined : ''}>
        <button className="m-mnav__x" aria-label="Close menu" onClick={() => setMenu(false)}>{I.close}</button>
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
                <a href="https://www.instagram.com/velmique_perfume/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg></a>
                <a href="https://www.facebook.com/profile.php?id=61589512171604" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2 0-3 1-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9Z"/></svg></a>
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
