import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

/* Gripzus header — a premium floating pill bar.
   A rounded, inset bar with a soft shadow; a sliding highlight glides
   behind the hovered/active nav item; icon actions with count badges. */

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

  const navRef = useRef(null);
  const linkRefs = useRef([]);
  const [hi, setHi] = useState({ left: 0, width: 0, opacity: 0 });

  const isActive = (href) => (href === '/' ? router.pathname === '/' : router.pathname.startsWith(href));
  const activeIdx = NAV.findIndex((l) => isActive(l.href));

  const moveHi = useCallback((el) => {
    if (!el || !navRef.current) return;
    const nav = navRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setHi({ left: r.left - nav.left, width: r.width, opacity: 1 });
  }, []);
  const resetHi = useCallback(() => {
    if (activeIdx >= 0 && linkRefs.current[activeIdx]) moveHi(linkRefs.current[activeIdx]);
    else setHi((s) => ({ ...s, opacity: 0 }));
  }, [activeIdx, moveHi]);
  useEffect(() => { resetHi(); }, [resetHi, router.pathname]);

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
      <header className="fixed top-3 md:top-4 inset-x-0 z-40">
        <div className="mx-auto w-full max-w-[1180px] px-3 md:px-5">
          <div className={`flex items-center gap-4 h-[58px] md:h-[64px] px-3 md:px-5 rounded-full border bg-paper/95 backdrop-blur-xl transition-all duration-300 ${
            scrolled ? 'border-line shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)]' : 'border-line/70 shadow-[0_4px_16px_-10px_rgba(0,0,0,0.10)]'
          }`}>

            <button onClick={() => setMobileOpen(true)} className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-[5px] group" aria-label="Open menu">
              <span className="block w-4.5 h-px bg-ink" style={{ width: 18 }} />
              <span className="block h-px bg-ink" style={{ width: 18 }} />
              <span className="block h-px bg-ink transition-all group-hover:w-[18px]" style={{ width: 12 }} />
            </button>

            <Link href="/" aria-label="Gripzus home" className="shrink-0 pl-1 flex items-center gap-0.5">
              {/* sock-G mark + wordmark, white bg knocked out via multiply on the light pill */}
              <img src="/Gripzusfavicon.jpeg" alt="" className="h-9 md:h-11 w-auto object-contain mix-blend-multiply" />
              <img src="/assets/Gripzus.JPG.jpeg" alt="Gripzus" className="h-4 md:h-[19px] w-auto object-contain mix-blend-multiply" />
            </Link>

            {/* Nav with sliding pill highlight */}
            <nav ref={navRef} onMouseLeave={resetHi} className="relative hidden lg:flex items-center gap-1 mx-auto">
              <span
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-8 rounded-full bg-black/[0.06] transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
                style={{ left: hi.left, width: hi.width, opacity: hi.opacity }}
              />
              {NAV.map((l, i) => (
                <Link
                  key={l.href}
                  href={l.href}
                  ref={(el) => (linkRefs.current[i] = el)}
                  onMouseEnter={(e) => moveHi(e.currentTarget)}
                  className={`relative z-10 px-3.5 py-2 text-[11px] font-medium tracking-[0.12em] uppercase rounded-full transition-colors ${
                    isActive(l.href) ? 'text-ink' : 'text-[#3d3d3d] hover:text-ink'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-0.5 ml-auto lg:ml-0">
              <IconBtn as={Link} href="/search" ariaLabel="Search">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
              </IconBtn>
              <IconBtn as={Link} href={accountHref} ariaLabel={isAuthenticated ? 'Account' : 'Sign in'}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" strokeLinecap="round" /></svg>
              </IconBtn>
              <IconBtn as={Link} href="/wishlist" ariaLabel="Wishlist" badge={wishCount}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" /></svg>
              </IconBtn>
              <IconBtn ariaLabel="Bag" onClick={openCart} badge={count}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 7h12l-1.5 11a2 2 0 01-2 1.8h-5a2 2 0 01-2-1.8L6 7z" /><path d="M9 7V5a3 3 0 016 0v2" strokeLinecap="round" /></svg>
              </IconBtn>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] lg:hidden animate-[fadeIn_.25s_ease]" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="fixed inset-y-0 left-0 z-[51] w-[88%] max-w-sm bg-paper lg:hidden flex flex-col gz-drawer">
            <div className="px-5 h-[58px] border-b border-line flex items-center justify-between">
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

function IconBtn({ as: Comp = 'button', children, ariaLabel, badge, ...rest }) {
  return (
    <Comp aria-label={ariaLabel} className="relative w-9 h-9 flex items-center justify-center rounded-full text-ink hover:bg-black/[0.06] transition-colors" {...rest}>
      {children}
      {Number(badge) > 0 && (
        <span key={badge} className="absolute top-0 right-0 min-w-[15px] h-[15px] px-1 rounded-full bg-ink text-paper text-[9px] font-medium flex items-center justify-center animate-[gzpop_.3s_cubic-bezier(.34,1.56,.64,1)]">
          {badge}
        </span>
      )}
      <style jsx>{`@keyframes gzpop { 0% { transform: scale(0); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }`}</style>
    </Comp>
  );
}
