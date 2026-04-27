'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, Search, User, Menu, X, ChevronDown } from 'lucide-react';
import { useStore } from '@/lib/store';

const navLinks = [
  {
    label: 'Collections', href: '/collections',
    sub: [
      { label: 'Noir', href: '/collections/noir' },
      { label: 'Signature', href: '/collections/signature' },
      { label: 'Luminara', href: '/collections/luminara' },
      { label: 'Extrait', href: '/collections/extrait' },
      { label: 'Tribute', href: '/collections/tribute' },
    ],
  },
  {
    label: 'Shop', href: '/shop',
    sub: [
      { label: 'All Fragrances', href: '/shop' },
      { label: 'For Men', href: '/shop?gender=Men' },
      { label: 'For Women', href: '/shop?gender=Women' },
      { label: 'Eau de Parfum', href: '/shop?category=Eau+de+Parfum' },
      { label: 'Extrait de Parfum', href: '/shop?category=Extrait+de+Parfum' },
      { label: 'Gift Sets', href: '/shop?category=Gift+Sets' },
      { label: 'Discovery Kits', href: '/shop?category=Discovery+Sets' },
    ],
  },
  { label: 'Lookbook', href: '/lookbook' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
];

export default function Navbar() {
  const { cartCount, wishlist, setCartOpen, setSearchOpen } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
                <div key={link.label} className="relative"
                  onMouseEnter={() => setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}>
                  <Link href={link.href}
                    className="group flex items-center gap-1 text-[11px] tracking-[0.25em] uppercase font-body text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors relative">
                    <span className="relative">
                      {link.label}
                      <span className={`absolute -bottom-1 left-0 h-px bg-[var(--gold)] transition-all duration-400 ${activeDropdown === link.label ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                    </span>
                    {link.sub && <ChevronDown size={10} className={`transition-transform ${activeDropdown === link.label ? 'rotate-180' : ''}`} />}
                  </Link>
                  {link.sub && activeDropdown === link.label && (
                    <div className="absolute top-full left-0 pt-3 z-50">
                      <div className="w-52 bg-white border border-[var(--border)] shadow-[0_20px_60px_-20px_rgba(26,22,18,0.15)] rounded-md py-2">
                        {link.sub.map(s => (
                          <Link key={s.label} href={s.href}
                            className="block px-5 py-2.5 text-[11px] tracking-[0.15em] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-all uppercase font-body">
                            {s.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Logo — centered */}
            <Link href="/" className="flex-shrink-0 mx-6 group">
              <span className={`font-serif tracking-[0.12em] transition-all duration-500 gold-text ${scrolled ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'}`}>
                VELMIQUE
              </span>
              <span className="block h-px w-0 group-hover:w-full bg-[var(--gold)] transition-all duration-500 mx-auto" />
            </Link>

            {/* Right nav */}
            <div className="hidden md:flex items-center gap-9 flex-1 justify-end">
              {navLinks.slice(3).map(link => (
                <Link key={link.label} href={link.href}
                  className="group text-[11px] tracking-[0.25em] uppercase font-body text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors relative">
                  <span className="relative">
                    {link.label}
                    <span className="absolute -bottom-1 left-0 h-px bg-[var(--gold)] w-0 group-hover:w-full transition-all duration-400" />
                  </span>
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
                <Link href="/account" className="hover:text-[var(--gold-deep)] transition-colors" aria-label="Account">
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
            <span className="font-serif text-xl gold-text tracking-[0.12em]">VELMIQUE</span>
            <button onClick={() => setMobileOpen(false)}><X size={20} className="text-[var(--ink-soft)]" /></button>
          </div>
          <div className="py-4 overflow-y-auto h-full pb-24">
            {navLinks.map(link => (
              <div key={link.label}>
                <div className="flex items-center justify-between px-6 py-3.5">
                  <Link href={link.href}
                    onClick={() => !link.sub && setMobileOpen(false)}
                    className="text-[11px] tracking-[0.25em] uppercase text-[var(--ink)] hover:text-[var(--gold-deep)] transition-colors font-body">
                    {link.label}
                  </Link>
                  {link.sub && (
                    <button onClick={() => setMobileExpanded(mobileExpanded === link.label ? null : link.label)}>
                      <ChevronDown size={14} className={`text-[var(--ink-muted)] transition-transform ${mobileExpanded === link.label ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {link.sub && mobileExpanded === link.label && (
                  <div className="bg-[var(--surface)] px-6 py-2">
                    {link.sub.map(s => (
                      <Link key={s.label} href={s.href} onClick={() => setMobileOpen(false)}
                        className="block py-2.5 text-[11px] tracking-[0.2em] uppercase text-[var(--ink-soft)] hover:text-[var(--gold-deep)] transition-colors font-body">
                        {s.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="h-px bg-[var(--border)] my-4 mx-6" />
            <Link href="/account" onClick={() => setMobileOpen(false)}
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
