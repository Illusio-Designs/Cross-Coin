import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

/* Gripzus header — editorial gallery. Quiet slim bar: logo left, tiny
   uppercase nav, minimal actions right, faint hairline. Lots of air. */

const NAV = [
  { label: 'Shop',        href: '/products' },
  { label: 'Collections', href: '/collections' },
  { label: 'Journal',     href: '/journal' },
  { label: 'About',       href: '/about' },
  { label: 'Contact',     href: '/contact' },
];

export default function Header() {
  const router = useRouter();
  const { count, openCart } = useCart();
  const { count: wishCount } = useWishlist();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const accountHref = isAuthenticated || authLoading ? '/account' : '/login';
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  const isActive = (href) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-[2px]">
        <div className="wrap">
          <div className="h-[56px] md:h-[64px] flex items-center gap-6">

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-8 h-8 -ml-1.5 flex items-center justify-center text-ink"
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <line x1="3" y1="8" x2="21" y2="8" /><line x1="3" y1="16" x2="21" y2="16" />
              </svg>
            </button>

            {/* Logo */}
            <Link href="/" aria-label="Gripzus home" className="shrink-0">
              <Image
                src="/assets/Gripzus.JPG.jpeg"
                alt="Gripzus"
                width={150} height={40} priority
                className="h-5 md:h-6 w-auto object-contain"
              />
            </Link>

            {/* Nav — tiny uppercase, quiet */}
            <nav className="hidden lg:flex items-center gap-8 ml-8">
              {NAV.map((l) => {
                const active = isActive(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`text-[11px] tracking-[0.12em] uppercase transition-opacity ${
                      active ? 'text-ink' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-auto">
              <IconBtn as={Link} href="/search" ariaLabel="Search">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
              </IconBtn>
              <IconBtn as={Link} href={accountHref} ariaLabel={isAuthenticated ? 'Account' : 'Sign in'}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" strokeLinecap="round" /></svg>
              </IconBtn>
              <IconBtn as={Link} href="/wishlist" ariaLabel="Wishlist" badge={wishCount}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" /></svg>
              </IconBtn>
              <IconBtn ariaLabel="Bag" onClick={openCart} badge={count}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 7h12l-1.5 11a2 2 0 01-2 1.8h-5a2 2 0 01-2-1.8L6 7z" /><path d="M9 7V5a3 3 0 016 0v2" strokeLinecap="round" /></svg>
              </IconBtn>
            </div>
          </div>
        </div>
        <div className="hairline" />
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-ink/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="fixed inset-y-0 left-0 z-[51] w-[86%] max-w-sm bg-paper shadow-card lg:hidden flex flex-col">
            <div className="px-5 h-[56px] border-b border-line flex items-center justify-between">
              <Image src="/assets/Gripzus.JPG.jpeg" alt="Gripzus" width={120} height={32} className="h-5 w-auto object-contain" />
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center text-ink" aria-label="Close menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto">
              {NAV.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                  className="block px-5 py-4 border-b border-line text-[13px] tracking-[0.1em] uppercase text-ink">
                  {l.label}
                </Link>
              ))}
              <div className="p-5 grid grid-cols-2 gap-3">
                <Link href={accountHref} onClick={() => setMobileOpen(false)} className="btn-outline !py-3 text-center">{isAuthenticated ? 'Account' : 'Sign In'}</Link>
                <Link href="/track-order" onClick={() => setMobileOpen(false)} className="btn-outline !py-3 text-center">Track</Link>
              </div>
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

function IconBtn({ as: Comp = 'button', children, ariaLabel, badge, ...rest }) {
  return (
    <Comp aria-label={ariaLabel} className="relative w-9 h-9 flex items-center justify-center text-ink hover:opacity-55 transition-opacity" {...rest}>
      {children}
      {Number(badge) > 0 && (
        <span className="absolute top-0.5 right-0 min-w-[15px] h-[15px] px-1 rounded-full bg-ink text-paper text-[9px] font-medium flex items-center justify-center">
          {badge}
        </span>
      )}
    </Comp>
  );
}
