'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, User, ShoppingBag, Heart } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useWishlistStore } from '@/store/wishlistStore'
import { useUiStore } from '@/store/uiStore'
import { MegaMenu } from './MegaMenu'
import { ROUTES, NAV_LINKS } from '@/lib/constants'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export function Navbar() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [activeMenu, setActiveMenu] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated } = useAuth()
  const closeTimer = useRef(null)
  const { itemCount, openDrawer } = useCart()
  const wishlistCount = useWishlistStore((s) => s.items.length)
  const openMobileMenu = useUiStore((s) => s.openMobileMenu)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleMouseEnter = useCallback((key) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveMenu(key)
  }, [])

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 120)
  }, [])

  const handleNavMouseEnter = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  const overHero = isHome && !scrolled
  const lightNav = overHero

  const navLinkCls = cn(
    'group relative inline-flex items-center px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] transition-colors duration-300 focus-visible:outline-none',
    lightNav
      ? 'text-white/80 hover:text-white'
      : 'text-brand-black/75 hover:text-brand-black'
  )
  const underline = cn(
    'pointer-events-none absolute -bottom-0.5 left-3 right-3 h-px origin-center scale-x-0 transition-transform duration-500 group-hover:scale-x-100',
    lightNav ? 'bg-gold-light' : 'bg-gold'
  )

  const iconBtnCls = cn(
    'relative flex h-9 w-9 items-center justify-center transition-colors duration-200 focus-visible:outline-none',
    lightNav ? 'text-white/80 hover:text-gold-light' : 'text-brand-black/75 hover:text-gold'
  )

  return (
    <header
      className={cn(
        'z-50 w-full transition-all duration-500',
        overHero ? 'absolute left-0 right-0 top-[30px]' : 'sticky top-0'
      )}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleNavMouseEnter}
    >
      <nav
        className={cn(
          'relative w-full border-b transition-all duration-500',
          overHero
            ? 'border-white/10 vq-glass-nav-dark'
            : scrolled
              ? 'border-gold/20 vq-glass-nav shadow-[0_8px_32px_rgba(58,46,26,0.08)]'
              : 'border-gold/15 bg-white/95'
        )}
        aria-label="Main navigation"
      >
        <div
          className={cn(
            'relative mx-auto grid max-w-[1480px] grid-cols-[1fr_auto_1fr] items-center px-5 transition-all duration-300 md:px-8',
            scrolled || !isHome ? 'h-[56px]' : 'h-[68px]'
          )}
        >
          <div className="flex items-center">
            <button
              onClick={openMobileMenu}
              className={cn(
                'flex h-9 w-9 items-center justify-center transition-colors focus-visible:outline-none lg:hidden',
                lightNav ? 'text-white/85 hover:text-white' : 'text-brand-black/80 hover:text-brand-black'
              )}
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            </button>

            <div className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map(({ label, href }) => {
                const isMega = href === ROUTES.products
                return (
                  <Link
                    key={href}
                    href={href}
                    onMouseEnter={() =>
                      isMega ? handleMouseEnter('products') : setActiveMenu(null)
                    }
                    className={navLinkCls}
                  >
                    {label}
                    <span className={underline} />
                  </Link>
                )
              })}
            </div>
          </div>

          <Link
            href={ROUTES.home}
            className="flex items-center gap-2.5 px-3 focus-visible:outline-none"
            aria-label="Velquira home"
          >
            <span
              className="vq-diamond"
              aria-hidden
              style={scrolled || !isHome ? { width: 5, height: 5 } : { width: 7, height: 7 }}
            />
            <span
              className={cn(
                'font-medium uppercase transition-all duration-300',
                lightNav ? 'text-white' : 'vq-wordmark',
                scrolled || !isHome
                  ? 'text-[16px] sm:text-[17px]'
                  : 'text-[18px] sm:text-[22px]'
              )}
              style={{ letterSpacing: scrolled || !isHome ? '0.3em' : '0.36em' }}
            >
              Velquira
            </span>
          </Link>

          <div className="flex items-center justify-end gap-0.5 sm:gap-1">
            <Link href={ROUTES.search} className={iconBtnCls} aria-label="Search">
              <Search size={17} strokeWidth={1.5} />
            </Link>
            <Link
              href={isAuthenticated ? ROUTES.account : ROUTES.login}
              className={iconBtnCls}
              aria-label={isAuthenticated ? 'Account' : 'Sign in'}
            >
              <User size={17} strokeWidth={1.5} />
            </Link>
            <Link
              href={ROUTES.wishlist}
              className={iconBtnCls}
              aria-label={`Wishlist, ${wishlistCount} items`}
            >
              <Heart
                size={16}
                strokeWidth={1.5}
                fill={wishlistCount > 0 ? 'currentColor' : 'none'}
                className={cn(wishlistCount > 0 && (lightNav ? 'text-gold-light' : 'text-gold'))}
              />
              {wishlistCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-gold px-[3px] text-[8px] font-semibold leading-none text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <button onClick={openDrawer} className={iconBtnCls} aria-label={`Bag, ${itemCount} items`}>
              <ShoppingBag size={17} strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-gold px-[3px] text-[8px] font-semibold leading-none text-white">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <MegaMenu activeMenu={activeMenu} />
      </nav>
    </header>
  )
}
