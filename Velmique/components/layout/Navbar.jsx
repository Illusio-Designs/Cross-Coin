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
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Sticky navbar — sits at top of viewport when scrolled past announcement bar */}
      <nav
        className={`sticky top-0 z-50 bg-[#14110e] transition-all duration-500 ${
          scrolled
            ? 'shadow-[0_1px_0_0_rgba(184,153,104,0.2),0_10px_40px_-20px_rgba(31,27,22,0.12)]'
            : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
          <div className={`flex items-center justify-between transition-all duration-500 ${scrolled ? 'h-14 md:h-16' : 'h-16 md:h-20'}`}>

            {/* Left nav */}
            <div className="hidden md:flex items-center gap-9 flex-1">
              {navLinks.slice(0, 3).map(link => (
                <div key={link.label} className="relative"
                  onMouseEnter={() => setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}>
                  <Link href={link.href}
                    className="group flex items-center gap-1 text-[11px] tracking-[0.25em] uppercase font-body text-[#b8b0a2] hover:text-[#f3ede0] transition-colors relative">
                    <span className="relative">
                      {link.label}
                      <span className={`absolute -bottom-1 left-0 h-px bg-[#b8624f] transition-all duration-400 ${activeDropdown === link.label ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                    </span>
                    {link.sub && <ChevronDown size={10} className={`transition-transform ${activeDropdown === link.label ? 'rotate-180' : ''}`} />}
                  </Link>
                  {link.sub && activeDropdown === link.label && (
                    <div className="absolute top-full left-0 pt-3 z-50">
                      <div className="w-52 bg-[#fbf8f2] border border-[#2e2821] shadow-[0_20px_60px_-20px_rgba(28,26,22,0.2)] py-2">
                        {link.sub.map(s => (
                          <Link key={s.label} href={s.href}
                            className="block px-5 py-2.5 text-[11px] tracking-[0.15em] text-[#b8b0a2] hover:text-[#f3ede0] hover:bg-[#26211b] transition-all uppercase font-body">
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
              <span className={`font-serif tracking-[0.12em] transition-all duration-500 text-[#f3ede0] ${scrolled ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'}`}>
                VELMIQUE
              </span>
              <span className="block h-px w-0 group-hover:w-full bg-[#b8624f] transition-all duration-500 mx-auto" />
            </Link>

            {/* Right nav */}
            <div className="hidden md:flex items-center gap-9 flex-1 justify-end">
              {navLinks.slice(3).map(link => (
                <Link key={link.label} href={link.href}
                  className="group text-[11px] tracking-[0.25em] uppercase font-body text-[#b8b0a2] hover:text-[#f3ede0] transition-colors relative">
                  <span className="relative">
                    {link.label}
                    <span className="absolute -bottom-1 left-0 h-px bg-[#b8624f] w-0 group-hover:w-full transition-all duration-400" />
                  </span>
                </Link>
              ))}

              <div className="flex items-center gap-5 ml-2 text-[#f3ede0]">
                <button onClick={() => setSearchOpen(true)} className="hover:text-[#d4927f] transition-colors" aria-label="Search">
                  <Search size={17} strokeWidth={1.3} />
                </button>
                <Link href="/wishlist" className="relative hover:text-[#d4927f] transition-colors" aria-label="Wishlist">
                  <Heart size={17} strokeWidth={1.3} />
                  {wishlist.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#b8624f] text-[#fbf8f2] text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                      {wishlist.length}
                    </span>
                  )}
                </Link>
                <Link href="/account" className="hover:text-[#d4927f] transition-colors" aria-label="Account">
                  <User size={17} strokeWidth={1.3} />
                </Link>
                <button onClick={() => setCartOpen(true)} className="relative hover:text-[#d4927f] transition-colors" aria-label="Cart">
                  <ShoppingBag size={17} strokeWidth={1.3} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#b8624f] text-[#fbf8f2] text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile */}
            <div className="flex md:hidden items-center gap-5 ml-auto text-[#f3ede0]">
              <button onClick={() => setSearchOpen(true)} aria-label="Search">
                <Search size={18} strokeWidth={1.3} />
              </button>
              <button onClick={() => setCartOpen(true)} className="relative" aria-label="Cart">
                <ShoppingBag size={18} strokeWidth={1.3} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#b8624f] text-[#fbf8f2] text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-semibold">
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
        <div className="absolute inset-0 bg-[#1c1a16]/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-[#fbf8f2] border-l border-[#2e2821] transition-transform duration-400 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-6 border-b border-[#2e2821]">
            <span className="font-serif text-xl text-[#f3ede0] tracking-[0.12em]">VELMIQUE</span>
            <button onClick={() => setMobileOpen(false)}><X size={20} className="text-[#b8b0a2]" /></button>
          </div>
          <div className="py-4 overflow-y-auto h-full pb-24">
            {navLinks.map(link => (
              <div key={link.label}>
                <div className="flex items-center justify-between px-6 py-3.5">
                  <Link href={link.href}
                    onClick={() => !link.sub && setMobileOpen(false)}
                    className="text-[11px] tracking-[0.25em] uppercase text-[#f3ede0] hover:text-[#d4927f] transition-colors font-body">
                    {link.label}
                  </Link>
                  {link.sub && (
                    <button onClick={() => setMobileExpanded(mobileExpanded === link.label ? null : link.label)}>
                      <ChevronDown size={14} className={`text-[#8b8578] transition-transform ${mobileExpanded === link.label ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {link.sub && mobileExpanded === link.label && (
                  <div className="bg-[#f0ead9] px-6 py-2">
                    {link.sub.map(s => (
                      <Link key={s.label} href={s.href} onClick={() => setMobileOpen(false)}
                        className="block py-2.5 text-[11px] tracking-[0.2em] uppercase text-[#b8b0a2] hover:text-[#d4927f] transition-colors font-body">
                        {s.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="h-px bg-[#e3dcc9] my-4 mx-6" />
            <Link href="/account" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-6 py-3.5 text-[11px] tracking-[0.25em] uppercase text-[#f3ede0] hover:text-[#d4927f] transition-colors font-body">
              <User size={16} strokeWidth={1.3} /> My Account
            </Link>
            <Link href="/wishlist" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-6 py-3.5 text-[11px] tracking-[0.25em] uppercase text-[#f3ede0] hover:text-[#d4927f] transition-colors font-body">
              <Heart size={16} strokeWidth={1.3} /> Wishlist {wishlist.length > 0 && <span className="ml-auto text-[#d4927f]">({wishlist.length})</span>}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
