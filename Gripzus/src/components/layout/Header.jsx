import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

/* Gripzus header — compact editorial bar.
   Logo left · hairline divider · nav · actions far right.
   ~64/72px tall. No top utility bar. */

const NAV = [
  { label: 'Shop',        href: '/products' },
  { label: 'Collections', href: '/collections' },
  { label: 'The Thread',  href: '/journal' },
  { label: 'About',       href: '/about' },
  { label: 'Contact',     href: '/contact' },
];

export default function Header() {
  const router = useRouter();
  const { count, openCart } = useCart();
  const { count: wishCount } = useWishlist();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Logged in (or still checking) → account; otherwise → sign in.
  const accountHref = isAuthenticated || authLoading ? '/account' : '/login';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
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

  const isActive = (href) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href);

  return (
    <>
      <header className={`sticky top-0 z-40 bg-paper transition-shadow duration-300 ${scrolled ? 'shadow-soft' : ''}`}>
        <div className="wrap">
          <div className="h-[64px] md:h-[72px] flex items-center gap-6">

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 -ml-2 flex items-center justify-center text-ink"
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="13" x2="21" y2="13" /><line x1="3" y1="19" x2="21" y2="19" />
              </svg>
            </button>

            {/* Logo */}
            <Link href="/" aria-label="Gripzus home" className="shrink-0">
              <Image
                src="/assets/Gripzus.JPG.jpeg"
                alt="Gripzus"
                width={150} height={44} priority
                className="h-8 md:h-9 w-auto object-contain"
              />
            </Link>

            {/* Divider */}
            <span className="hidden lg:block w-px h-6 bg-line" />

            {/* Nav — left-aligned, editorial */}
            <nav className="hidden lg:flex items-center gap-7">
              {NAV.map((l) => {
                const active = isActive(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`group relative text-[12px] tracking-[0.1em] uppercase font-medium transition-colors ${
                      active ? 'text-ink' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {l.label}
                    <span
                      aria-hidden
                      className={`absolute -bottom-1.5 left-0 h-px bg-clay transition-all duration-300 ${
                        active ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Actions — pushed to the far right */}
            <div className="flex items-center gap-0.5 ml-auto">
              <IconBtn ariaLabel="Search" onClick={() => setSearchOpen((s) => !s)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
              </IconBtn>
              <IconBtn as={Link} href={accountHref} ariaLabel={isAuthenticated ? 'Account' : 'Sign in'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" strokeLinecap="round" /></svg>
              </IconBtn>
              <IconBtn as={Link} href="/wishlist" ariaLabel="Wishlist" badge={wishCount}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" /></svg>
              </IconBtn>
              <IconBtn ariaLabel="Bag" onClick={openCart} badge={count}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 7h12l-1.5 11a2 2 0 01-2 1.8h-5a2 2 0 01-2-1.8L6 7z" /><path d="M9 7V5a3 3 0 016 0v2" strokeLinecap="round" /></svg>
              </IconBtn>
            </div>
          </div>
        </div>
        <div className="hairline" />

        {searchOpen && (
          <div className="bg-paper border-b border-line">
            <div className="wrap py-4 flex items-center gap-4">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-muted"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
              <input
                autoFocus type="text" placeholder="Search socks, collections…"
                onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { router.push(`/search?q=${encodeURIComponent(e.target.value.trim())}`); setSearchOpen(false); } }}
                className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-muted text-base"
              />
              <button onClick={() => setSearchOpen(false)} className="eyebrow hover:text-ink">Close</button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="fixed inset-y-0 left-0 z-[51] w-[84%] max-w-sm bg-paper shadow-card lg:hidden flex flex-col">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <Image src="/assets/Gripzus.JPG.jpeg" alt="Gripzus" width={120} height={36} className="h-8 w-auto object-contain" />
              <button onClick={() => setMobileOpen(false)} className="w-9 h-9 flex items-center justify-center text-ink" aria-label="Close menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-6 py-4">
              {NAV.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                  className="block py-3.5 border-b border-line text-[13px] tracking-[0.12em] uppercase font-medium text-ink">
                  {l.label}
                </Link>
              ))}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link href={accountHref} onClick={() => setMobileOpen(false)} className="eyebrow text-center py-3 border border-line hover:border-ink transition-colors">{isAuthenticated ? 'Account' : 'Sign In'}</Link>
                <Link href="/track-order" onClick={() => setMobileOpen(false)} className="eyebrow text-center py-3 border border-line hover:border-ink transition-colors">Track Order</Link>
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
    <Comp aria-label={ariaLabel} className="relative w-9 h-9 flex items-center justify-center text-ink hover:text-clay transition-colors" {...rest}>
      {children}
      {Number(badge) > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-clay text-paper text-[9px] font-semibold flex items-center justify-center">
          {badge}
        </span>
      )}
    </Comp>
  );
}
