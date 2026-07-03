'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Search, User, ShoppingBag, Heart } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useWishlistStore } from '@/store/wishlistStore'
import { useUiStore } from '@/store/uiStore'
import { MegaMenu } from './MegaMenu'
import { VelquiraLogo } from '@/components/brand/VelquiraLogo'
import { ROUTES, NAV_LINKS } from '@/lib/constants'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const ANNOUNCEMENT = [
  'Complimentary insured shipping above ₹2,500',
  'Hallmarked 18k gold',
  'Lifetime atelier care',
]

function NavLink({ href, children, onMouseEnter, active }) {
  return (
    <Link
      href={href}
      onMouseEnter={onMouseEnter}
      className={cn(
        'vq-maison-link group relative px-3 py-1 font-display text-[13px] tracking-[0.12em] text-brand-black/70 transition-colors duration-300 hover:text-brand-black lg:px-4',
        active && 'text-brand-black'
      )}
    >
      {children}
      <span
        aria-hidden
        className="absolute -bottom-1 left-1/2 h-px w-0 -translate-x-1/2 bg-gold transition-all duration-500 ease-out group-hover:w-[calc(100%-8px)]"
      />
    </Link>
  )
}

function IconAction({ onClick, href, label, count, children }) {
  const inner = (
    <>
      {children}
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border border-ivory bg-gold px-0.5 text-[7px] font-semibold leading-none text-brand-black">
          {count}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </>
  )

  const cls =
    'vq-nav-icon group relative flex flex-col items-center gap-0.5 px-2 py-1 text-brand-black/60 transition-colors hover:text-gold'

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} aria-label={label}>
        {inner}
      </button>
    )
  }

  return (
    <Link href={href} className={cls} aria-label={label}>
      {inner}
    </Link>
  )
}

/**
 * Navbar — Velquira Maison header.
 * Announcement ribbon + ivory atelier bar with centred stacked logo,
 * flanking serif navigation, and quiet gold hairlines. Stable on scroll.
 */
export function Navbar() {
  const [activeMenu, setActiveMenu] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated } = useAuth()
  const closeTimer = useRef(null)
  const { itemCount, openDrawer } = useCart()
  const wishlistCount = useWishlistStore((s) => s.items.length)
  const openMobileMenu = useUiStore((s) => s.openMobileMenu)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleMouseEnter = useCallback((key) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveMenu(key)
  }, [])

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 160)
  }, [])

  const handleNavMouseEnter = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  return (
    <header
      className={cn(
        'vq-maison-header sticky top-0 z-50 w-full transition-shadow duration-500',
        scrolled && 'shadow-[0_8px_32px_rgba(58,46,26,0.07)]'
      )}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleNavMouseEnter}
    >
      {/* Ribbon */}
      <div className="relative overflow-hidden border-b border-gold/20 bg-brand-black">
        <span className="vq-shine opacity-25" aria-hidden />
        <div className="flex h-[28px] items-center justify-center px-4">
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-0 text-[9px] font-light uppercase tracking-[0.38em] text-white/75">
            {ANNOUNCEMENT.map((line, i) => (
              <span key={line} className="flex items-center gap-4">
                <span className="text-gold-light/90">{line}</span>
                {i < ANNOUNCEMENT.length - 1 && (
                  <span className="vq-diamond hidden opacity-60 sm:inline-block" style={{ width: 4, height: 4 }} />
                )}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Main atelier bar */}
      <nav className="relative bg-ivory" aria-label="Main navigation">
        <div className="vq-nav-rule-top" aria-hidden />
        <div className="vq-nav-rule-bottom" aria-hidden />

        <div className="mx-auto flex h-[76px] max-w-[1480px] items-center justify-between px-5 md:h-[84px] md:px-10 lg:px-14">
          {/* Mobile menu */}
          <button
            onClick={openMobileMenu}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
            aria-label="Open menu"
          >
            <span className="block h-px w-6 bg-brand-black/80" />
            <span className="block h-px w-4 bg-gold" />
            <span className="block h-px w-6 bg-brand-black/80" />
          </button>

          {/* Left nav — desktop */}
          <div className="hidden flex-1 items-center justify-end gap-1 lg:flex">
            {NAV_LINKS.slice(0, 2).map(({ label, href }) => (
              <NavLink
                key={href}
                href={href}
                active={activeMenu === 'products' && href === ROUTES.products}
                onMouseEnter={() =>
                  href === ROUTES.products ? handleMouseEnter('products') : setActiveMenu(null)
                }
              >
                {label}
              </NavLink>
            ))}
            <span className="mx-3 hidden h-3 w-px bg-gold/35 lg:block" aria-hidden />
          </div>

          {/* Centre — stacked maison logo */}
          <Link
            href={ROUTES.home}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none lg:static lg:translate-x-0 lg:translate-y-0"
            aria-label="Velquira home"
          >
            <VelquiraLogo
              layout="stacked"
              size="md"
              showTagline
              priority
              className="px-2"
            />
          </Link>

          {/* Right nav + icons */}
          <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1">
            <div className="mr-2 hidden items-center lg:flex">
              <span className="mr-3 hidden h-3 w-px bg-gold/35 lg:block" aria-hidden />
              {NAV_LINKS.slice(2).map(({ label, href }) => (
                <NavLink key={href} href={href}>
                  {label}
                </NavLink>
              ))}
            </div>

            <div className="ml-1 flex items-center border-l border-gold/20 pl-2 sm:pl-3">
              <IconAction href={ROUTES.search} label="Search">
                <Search size={16} strokeWidth={1.3} />
              </IconAction>
              <IconAction
                href={isAuthenticated ? ROUTES.account : ROUTES.login}
                label={isAuthenticated ? 'Account' : 'Sign in'}
              >
                <User size={16} strokeWidth={1.3} />
              </IconAction>
              <IconAction href={ROUTES.wishlist} label="Wishlist" count={wishlistCount}>
                <Heart
                  size={15}
                  strokeWidth={1.3}
                  fill={wishlistCount > 0 ? 'currentColor' : 'none'}
                  className={wishlistCount > 0 ? 'text-gold' : undefined}
                />
              </IconAction>
              <IconAction onClick={openDrawer} label="Bag" count={itemCount}>
                <ShoppingBag size={16} strokeWidth={1.3} />
              </IconAction>
            </div>
          </div>
        </div>

        <MegaMenu activeMenu={activeMenu} />
      </nav>
    </header>
  )
}
