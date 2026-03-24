'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, Search, User, Menu, X, ChevronDown } from 'lucide-react';
import { useStore } from '@/lib/store';

const navLinks = [
  {
    label: 'Collections',
    href: '/collections',
    sub: [
      { label: 'Noir', href: '/collections/noir' },
      { label: 'Signature', href: '/collections/signature' },
      { label: 'Luminara', href: '/collections/luminara' },
      { label: 'Extrait', href: '/collections/extrait' },
      { label: 'Tribute', href: '/collections/tribute' },
    ],
  },
  {
    label: 'Shop',
    href: '/shop',
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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white shadow-sm border-b border-black/8'
            : 'bg-transparent'
        }`}
        style={{ top: 'var(--announcement-h, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">

            {/* Left nav */}
            <div className="hidden md:flex items-center gap-8 flex-1">
              {navLinks.slice(0, 3).map(link => (
                <div key={link.label} className="relative"
                  onMouseEnter={() => setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}>
                  <Link href={link.href}
                    className={`flex items-center gap-1 text-[11px] tracking-[0.15em] uppercase font-body transition-colors ${
                      scrolled ? 'text-black/70 hover:text-[#C9A84C]' : 'text-white/80 hover:text-[#C9A84C]'
                    }`}>
                    {link.label}
                    {link.sub && <ChevronDown size={11} className={`transition-transform ${activeDropdown === link.label ? 'rotate-180' : ''}`} />}
                  </Link>
                  {link.sub && activeDropdown === link.label && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-black/8 shadow-lg py-2 z-50">
                      {link.sub.map(s => (
                        <Link key={s.label} href={s.href}
                          className="block px-4 py-2.5 text-[11px] tracking-wider text-black/60 hover:text-[#C9A84C] hover:bg-[#C9A84C]/5 transition-all uppercase font-body">
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 mx-8">
              <span className={`font-serif text-2xl md:text-3xl font-bold tracking-wide transition-colors ${
                scrolled ? 'text-black' : 'text-white'
              }`}>
                Velmique
              </span>
            </Link>

            {/* Right nav */}
            <div className="hidden md:flex items-center gap-8 flex-1 justify-end">
              {navLinks.slice(3).map(link => (
                <Link key={link.label} href={link.href}
                  className={`text-[11px] tracking-[0.15em] uppercase font-body transition-colors ${
                    scrolled ? 'text-black/70 hover:text-[#C9A84C]' : 'text-white/80 hover:text-[#C9A84C]'
                  }`}>
                  {link.label}
                </Link>
              ))}

              <div className="flex items-center gap-4 ml-2">
                <button onClick={() => setSearchOpen(true)}
                  className={`transition-colors ${scrolled ? 'text-black/60 hover:text-[#C9A84C]' : 'text-white/70 hover:text-[#C9A84C]'}`}>
                  <Search size={18} />
                </button>
                <Link href="/wishlist"
                  className={`relative transition-colors ${scrolled ? 'text-black/60 hover:text-[#C9A84C]' : 'text-white/70 hover:text-[#C9A84C]'}`}>
                  <Heart size={18} />
                  {wishlist.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#C9A84C] text-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {wishlist.length}
                    </span>
                  )}
                </Link>
                <Link href="/account"
                  className={`transition-colors ${scrolled ? 'text-black/60 hover:text-[#C9A84C]' : 'text-white/70 hover:text-[#C9A84C]'}`}>
                  <User size={18} />
                </Link>
                <button onClick={() => setCartOpen(true)}
                  className={`relative transition-colors ${scrolled ? 'text-black/60 hover:text-[#C9A84C]' : 'text-white/70 hover:text-[#C9A84C]'}`}>
                  <ShoppingBag size={18} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#C9A84C] text-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile */}
            <div className="flex md:hidden items-center gap-4 ml-auto">
              <button onClick={() => setSearchOpen(true)}
                className={scrolled ? 'text-black/60' : 'text-white/70'}>
                <Search size={18} />
              </button>
              <button onClick={() => setCartOpen(true)}
                className={`relative ${scrolled ? 'text-black/60' : 'text-white/70'}`}>
                <ShoppingBag size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#C9A84C] text-black text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
              <button onClick={() => setMobileOpen(!mobileOpen)}
                className={scrolled ? 'text-black/60' : 'text-white/70'}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-72 bg-white border-l border-black/8 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-5 border-b border-black/8">
            <span className="font-serif text-xl text-black font-bold">Velmique</span>
            <button onClick={() => setMobileOpen(false)}><X size={20} className="text-black/40" /></button>
          </div>
          <div className="py-4 overflow-y-auto h-full pb-24">
            {navLinks.map(link => (
              <div key={link.label}>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <Link href={link.href}
                    onClick={() => !link.sub && setMobileOpen(false)}
                    className="text-[11px] tracking-[0.2em] uppercase text-black/70 hover:text-[#C9A84C] transition-colors font-body">
                    {link.label}
                  </Link>
                  {link.sub && (
                    <button onClick={() => setMobileExpanded(mobileExpanded === link.label ? null : link.label)}>
                      <ChevronDown size={14} className={`text-black/30 transition-transform ${mobileExpanded === link.label ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {link.sub && mobileExpanded === link.label && (
                  <div className="bg-[#f8f8f8] px-5 py-2">
                    {link.sub.map(s => (
                      <Link key={s.label} href={s.href} onClick={() => setMobileOpen(false)}
                        className="block py-2.5 text-[11px] tracking-wider uppercase text-black/50 hover:text-[#C9A84C] transition-colors font-body">
                        {s.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="h-px bg-black/8 my-4 mx-5" />
            <Link href="/account" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-5 py-3.5 text-[11px] tracking-[0.2em] uppercase text-black/70 hover:text-[#C9A84C] transition-colors font-body">
              <User size={16} /> My Account
            </Link>
            <Link href="/wishlist" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-5 py-3.5 text-[11px] tracking-[0.2em] uppercase text-black/70 hover:text-[#C9A84C] transition-colors font-body">
              <Heart size={16} /> Wishlist {wishlist.length > 0 && <span className="ml-auto text-[#C9A84C]">({wishlist.length})</span>}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
