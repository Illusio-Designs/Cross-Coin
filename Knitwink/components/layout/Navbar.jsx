'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Search, User, ShoppingBag, Heart } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useWishlistStore } from '@/store/wishlistStore'
import { useUiStore } from '@/store/uiStore'
import { MegaMenu } from './MegaMenu'
import { ROUTES, NAV_LINKS } from '@/lib/constants'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  // Temporarily hidden — restore when these sections are ready
  // { label: 'Men', key: 'men' },
  // { label: 'Women', key: 'women' },
  // { label: 'Sale', key: 'sale' },
]

export function Navbar() {
  const [activeMenu, setActiveMenu] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated } = useAuth()
  const closeTimer = useRef(null)
  const { itemCount, openDrawer } = useCart()
  const wishlistCount = useWishlistStore((s) => s.items.length)
  const openMobileMenu = useUiStore((s) => s.openMobileMenu)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleMouseEnter = useCallback((key) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveMenu(key)
  }, [])

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 100)
  }, [])

  const handleNavMouseEnter = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  const iconBtn = 'flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-full text-gray-700 transition-colors duration-150 hover:bg-black/5 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1'

  return (
    <div
      className={cn(
        'fixed left-5 right-5 z-50 transition-all duration-300 md:right-5',
        scrolled ? 'top-2' : 'top-12 md:top-13'
      )}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleNavMouseEnter}
    >
      <nav
        className={cn(
          'relative grid grid-cols-[auto_1fr_auto] items-center rounded-2xl bg-white px-4 transition-all duration-300',
          scrolled
            ? 'h-[50px] shadow-[0_4px_24px_rgba(0,0,0,0.14),0_0_0_0.5px_rgba(0,0,0,0.06)]'
            : 'h-[50px] shadow-[0_2px_20px_rgba(0,0,0,0.10),0_0_0_0.5px_rgba(0,0,0,0.05)]'
        )}
        aria-label="Main navigation"
      >
        {/* Left: hamburger (mobile) / logo (desktop) */}
        <div className="flex items-center">
          <button onClick={openMobileMenu} className={cn(iconBtn, 'lg:hidden')} aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="lg:w-5 lg:h-5">
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </svg>
          </button>
          <Link href={ROUTES.home} className="hidden lg:block focus-visible:outline-none" aria-label="Knitwink home">
            <img src="/logo.png" alt="Knitwink" className="h-8 w-auto object-contain" />
          </Link>
        </div>

        {/* Center — mobile logo + desktop nav links */}
        <div className="flex items-center justify-center gap-1">
          <Link href={ROUTES.home} className="lg:hidden focus-visible:outline-none" aria-label="Knitwink home">
            <img src="/logo.png" alt="Knitwink" className="h-9 w-auto object-contain" />
          </Link>
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="hidden lg:flex h-10 items-center rounded-full px-4 text-[13px] font-medium tracking-wide text-gray-700 transition-colors duration-150 hover:bg-black/5 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-0 lg:gap-0.5">
          <Link href={ROUTES.search} className={iconBtn} aria-label="Search">
            <Search size={19} strokeWidth={1.5} className="lg:w-[18px] lg:h-[18px]" />
          </Link>
          <Link href={isAuthenticated ? ROUTES.account : ROUTES.login} className={iconBtn} aria-label="Account">
            <User size={19} strokeWidth={1.6} className="lg:w-[17px] lg:h-[17px]" />
          </Link>
          <Link
            href={ROUTES.wishlist}
            className={cn(iconBtn, 'relative')}
            aria-label={`Wishlist, ${wishlistCount} item${wishlistCount === 1 ? '' : 's'}`}
          >
            <Heart
              size={18}
              strokeWidth={1.6}
              fill={wishlistCount > 0 ? 'currentColor' : 'none'}
              className={cn('lg:w-[17px] lg:h-[17px]', wishlistCount > 0 && 'text-brand-black')}
            />
            {wishlistCount > 0 && (
              <span className="absolute right-0 top-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-brand-black text-[7px] font-semibold leading-none text-white lg:right-1 lg:top-1 lg:h-3.5 lg:w-3.5 lg:text-[8px]">
                {wishlistCount}
              </span>
            )}
          </Link>
          <button onClick={openDrawer} className={cn(iconBtn, 'relative')} aria-label={`Cart, ${itemCount} items`}>
            <ShoppingBag size={18} strokeWidth={1.5} className="lg:w-[18px] lg:h-[18px]" />
            {itemCount > 0 && (
              <span className="absolute right-0 top-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-brand-black text-[7px] font-semibold leading-none text-white lg:right-1 lg:top-1 lg:h-3.5 lg:w-3.5 lg:text-[8px]">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        <MegaMenu activeMenu={activeMenu} />
      </nav>
    </div>
  )
}
