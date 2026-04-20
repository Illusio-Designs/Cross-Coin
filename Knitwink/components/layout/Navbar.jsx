'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Search, User, ShoppingBag } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useUiStore } from '@/store/uiStore'
import { MegaMenu } from './MegaMenu'
import { ROUTES } from '@/lib/constants'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Men', key: 'men' },
  { label: 'Women', key: 'women' },
  { label: 'Sale', key: 'sale' },
]

export function Navbar() {
  const [activeMenu, setActiveMenu] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated } = useAuth()
  const closeTimer = useRef(null)
  const { itemCount, openDrawer } = useCart()
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

  const iconBtn = 'flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors duration-150 hover:bg-black/5 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1'

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
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
          {NAV_ITEMS.map(({ label, key }) => (
            <button
              key={key}
              onMouseEnter={() => handleMouseEnter(key)}
              className={cn(
                'hidden lg:flex h-10 items-center rounded-full px-4 text-[13px] font-medium tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage',
                activeMenu === key ? 'bg-black/5 text-brand-black' : 'text-gray-700 hover:bg-black/5 hover:text-brand-black'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-0.5">
          <Link href={ROUTES.about} className="hidden h-10 items-center rounded-full px-3 text-[13px] font-normal text-gray-700 transition-colors hover:bg-black/5 hover:text-brand-black lg:flex">
            About
          </Link>
          <Link href="/journal" className="hidden h-10 items-center rounded-full px-3 text-[13px] font-normal text-gray-700 transition-colors hover:bg-black/5 hover:text-brand-black lg:flex">
            Journal
          </Link>
          <Link href={ROUTES.search} className={iconBtn} aria-label="Search">
            <Search size={18} strokeWidth={1.5} />
          </Link>
          <Link href={isAuthenticated ? ROUTES.account : ROUTES.login} className={cn(iconBtn, 'hidden lg:flex')} aria-label="Account">
            <User size={17} strokeWidth={1.6} />
          </Link>
          <button onClick={openDrawer} className={cn(iconBtn, 'relative')} aria-label={`Cart, ${itemCount} items`}>
            <ShoppingBag size={18} strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-black text-[8px] font-semibold text-white">
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
