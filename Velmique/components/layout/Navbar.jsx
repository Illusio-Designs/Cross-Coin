'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Heart, Search, User, Menu, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/context/AuthContext';

const navLinks = [
  { label: 'Collections', href: '/collections' },
  { label: 'Shop',        href: '/shop' },
  { label: 'About',       href: '/about' },
  { label: 'Blog',        href: '/blog' },
];

export default function Navbar() {
  const { cartCount, wishlist, setCartOpen, setSearchOpen } = useStore();
  const { isAuthenticated } = useAuth();
  const accountHref = isAuthenticated ? '/account' : '/login';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkClass = 'group text-[11px] tracking-[0.25em] uppercase font-body text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors relative';
  const underline = <span className="absolute -bottom-1 left-0 h-px bg-[var(--gold)] w-0 group-hover:w-full transition-all duration-400" />;

  return (
    <>
      <nav
        className={`sticky top-0 z-50 bg-[var(--bg)] transition-shadow duration-300 ${
          scrolled
            ? 'shadow-[0_1px_0_0_var(--border),0_10px_30px_-20px_rgba(26,22,18,0.15)]'
            : ''
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">
          <div className={`flex items-center justify-between transition-[height] duration-500 ${scrolled ? 'h-14 md:h-16' : 'h-16 md:h-20 border-b border-[var(--border)]'}`}>

            {/* Left nav */}
            <div className="hidden md:flex items-center gap-9 flex-1">
              {navLinks.slice(0, 3).map(link => (
                <Link key={link.label} href={link.href} className={linkClass}>
                  <span className="relative">{link.label}{underline}</span>
                </Link>
              ))}
            </div>

            {/* Logo — centered, no hover effect */}
            <Link href="/" className="flex-shrink-0 mx-6" aria-label="Velmique home">
              <Image
                src="/logo.webp"
                alt="Velmique"
                width={220}
                height={54}
                priority
                className={`w-auto object-contain transition-all duration-500 ${scrolled ? 'h-8 md:h-10' : 'h-10 md:h-12'}`}
              />
            </Link>

            {/* Right nav */}
            <div className="hidden md:flex items-center gap-9 flex-1 justify-end">
              {navLinks.slice(3).map(link => (
                <Link key={link.label} href={link.href} className={linkClass}>
                  <span className="relative">{link.label}{underline}</span>
                </Link>
              ))}

              <div className="flex items-center gap-5 ml-2 text-[var(--ink)]">
                <button onClick={() => setSearchOpen(true)} className="hover:text-[var(--gold-deep)] transition-colors" aria-label="Search">
                  <Search size={17} strokeWidth={1.3} />
                </button>
                <Link href="/wishlist" className="relative hover:text-[var(--gold-deep)] transition-colors" aria-label="Wishlist">
                  <Heart size={17} strokeWidth={1.3} />
                  {wishlist.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[var(--gold)] text-[var(--ink)] text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                      {wishlist.length}
                    </span>
                  )}
                </Link>
                <Link href={accountHref} className="hover:text-[var(--gold-deep)] transition-colors" aria-label="Account">
                  <User size={17} strokeWidth={1.3} />
                </Link>
                <button onClick={() => setCartOpen(true)} className="relative hover:text-[var(--gold-deep)] transition-colors" aria-label="Cart">
                  <ShoppingBag size={17} strokeWidth={1.3} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[var(--gold)] text-[var(--ink)] text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile */}
            <div className="flex md:hidden items-center gap-5 ml-auto text-[var(--ink)]">
              <button onClick={() => setSearchOpen(true)} aria-label="Search">
                <Search size={18} strokeWidth={1.3} />
              </button>
              <button onClick={() => setCartOpen(true)} className="relative" aria-label="Cart">
                <ShoppingBag size={18} strokeWidth={1.3} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[var(--gold)] text-[var(--ink)] text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-semibold">
                    {cartCount}
                  </span>
                )}
              </button>
              <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-[60] md:hidden transition-all duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-[var(--bg)] border-l border-[var(--border)] transition-transform duration-400 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
            <Link href="/" onClick={() => setMobileOpen(false)} aria-label="Velmique home">
              <Image
                src="/logo.webp"
                alt="Velmique"
                width={180}
                height={44}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <button onClick={() => setMobileOpen(false)}><X size={20} className="text-[var(--ink-soft)]" /></button>
          </div>
          <div className="py-4 overflow-y-auto h-full pb-24">
            {navLinks.map(link => (
              <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)}
                className="block px-6 py-3.5 text-[11px] tracking-[0.25em] uppercase text-[var(--ink)] hover:text-[var(--gold-deep)] transition-colors font-body">
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-[var(--border)] my-4 mx-6" />
            <Link href={accountHref} onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-6 py-3.5 text-[11px] tracking-[0.25em] uppercase text-[var(--ink)] hover:text-[var(--gold-deep)] transition-colors font-body">
              <User size={16} strokeWidth={1.3} /> My Account
            </Link>
            <Link href="/wishlist" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-6 py-3.5 text-[11px] tracking-[0.25em] uppercase text-[var(--ink)] hover:text-[var(--gold-deep)] transition-colors font-body">
              <Heart size={16} strokeWidth={1.3} /> Wishlist {wishlist.length > 0 && <span className="ml-auto text-[var(--gold-deep)]">({wishlist.length})</span>}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
