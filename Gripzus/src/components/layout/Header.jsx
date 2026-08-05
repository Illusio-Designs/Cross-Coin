import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

/* Gripzus header — "The Frame". A full-width, hairline-ruled bar (no floating
   pill): wordmark left, a centered underline-nav, minimal square icon actions
   right. Architectural and monochrome — matches the GROUND INDEX system.
   Height is kept at 76/84px so the global top clearance in _app.js still fits. */

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

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href) => (href === '/' ? router.pathname === '/' : router.pathname.startsWith(href));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-40 bg-paper/95 backdrop-blur-xl border-b transition-all duration-300 ${
        scrolled ? 'border-line shadow-[0_1px_0_0_var(--line),0_12px_28px_-24px_rgba(0,0,0,0.35)]' : 'border-line/70'
      }`}>
        <div className="wrap grid grid-cols-[auto_1fr_auto] items-center h-[76px] md:h-[84px] gap-4">

          {/* Left — hamburger (mobile) + wordmark */}
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-[5px] group" aria-label="Open menu">
              <span className="block h-px bg-ink" style={{ width: 18 }} />
              <span className="block h-px bg-ink" style={{ width: 18 }} />
              <span className="block h-px bg-ink transition-all group-hover:w-[18px]" style={{ width: 12 }} />
            </button>
            <Link href="/" aria-label="Gripzus home" className="shrink-0 flex items-center gap-0.5">
              <img src="/Gripzusfavicon.jpeg" alt="" className="h-9 md:h-11 w-auto object-contain mix-blend-multiply" />
              <img src="/assets/Gripzus.JPG.jpeg" alt="Gripzus" className="h-4 md:h-[19px] w-auto object-contain mix-blend-multiply" />
            </Link>
          </div>

          {/* Center — underline nav */}
          <nav className="hidden lg:flex items-center justify-center gap-8">
            {NAV.map((l) => {
              const active = isActive(l.href);
              return (
                <Link key={l.href} href={l.href}
                  className={`group relative py-1 text-[11px] font-medium tracking-[0.16em] uppercase transition-colors ${active ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}>
                  {l.label}
                  <span className={`pointer-events-none absolute -bottom-0.5 left-0 h-px bg-ink transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                </Link>
              );
            })}
          </nav>

          {/* Right — square icon actions with hairline dividers */}
          <div className="flex items-center justify-end">
            <IconBtn as={Link} href="/search" ariaLabel="Search">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
            </IconBtn>
            <IconBtn as={Link} href={accountHref} ariaLabel={isAuthenticated ? 'Account' : 'Sign in'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" strokeLinecap="round" /></svg>
            </IconBtn>
            <IconBtn as={Link} href="/wishlist" ariaLabel="Wishlist" badge={wishCount}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" /></svg>
            </IconBtn>
            <IconBtn ariaLabel="Bag" onClick={openCart} badge={count} divide>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 7h12l-1.5 11a2 2 0 01-2 1.8h-5a2 2 0 01-2-1.8L6 7z" /><path d="M9 7V5a3 3 0 016 0v2" strokeLinecap="round" /></svg>
            </IconBtn>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] lg:hidden animate-[fadeIn_.25s_ease]" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="fixed inset-y-0 left-0 z-[51] w-[88%] max-w-sm bg-paper lg:hidden flex flex-col gz-drawer">
            <div className="px-5 h-[76px] border-b border-line flex items-center justify-between">
              <span className="flex items-center gap-0.5">
                <img src="/Gripzusfavicon.jpeg" alt="" className="h-9 w-auto object-contain mix-blend-multiply" />
                <img src="/assets/Gripzus.JPG.jpeg" alt="Gripzus" className="h-4 w-auto object-contain mix-blend-multiply" />
              </span>
              <button onClick={() => setMobileOpen(false)} className="w-9 h-9 flex items-center justify-center text-ink hover:rotate-90 transition-transform" aria-label="Close menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {NAV.map((l, i) => (
                <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                  className="gz-drawer-item flex items-baseline gap-3 px-5 py-3.5 border-b border-line group"
                  style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
                  <span className="text-[10px] text-ink-muted tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-lg text-ink group-hover:translate-x-1 transition-transform">{l.label}</span>
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

      <style jsx>{`
        .gz-drawer { animation: gz-slide .38s cubic-bezier(.22,1,.36,1); box-shadow: 0 20px 60px -30px rgba(0,0,0,.35); }
        @keyframes gz-slide { from { transform: translateX(-100%); } to { transform: none; } }
        .gz-drawer-item { opacity: 0; transform: translateX(-10px); animation: gz-item .4s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes gz-item { to { opacity: 1; transform: none; } }
      `}</style>
    </>
  );
}

function IconBtn({ as: Comp = 'button', children, ariaLabel, badge, divide, ...rest }) {
  return (
    <Comp aria-label={ariaLabel} className={`relative w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-ink hover:bg-black/[0.05] transition-colors ${divide ? 'ml-2 border-l border-line pl-3 md:pl-4' : ''}`} {...rest}>
      {children}
      {Number(badge) > 0 && (
        <span key={badge} className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-ink text-paper text-[10px] font-semibold leading-none flex items-center justify-center animate-[gzpop_.3s_cubic-bezier(.34,1.56,.64,1)]">
          {badge}
        </span>
      )}
      <style jsx>{`@keyframes gzpop { 0% { transform: scale(0); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }`}</style>
    </Comp>
  );
}
