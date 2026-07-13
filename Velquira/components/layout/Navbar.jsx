'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, User, ShoppingBag, Heart, Menu } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useWishlistStore } from '@/store/wishlistStore'
import { useUiStore } from '@/store/uiStore'
import { ROUTES } from '@/lib/constants'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

function IconAction({ onClick, href, label, count, children }) {
  const inner = (
    <>
      <div className="relative">
        {children}
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-0.5 text-[8px] font-bold leading-none text-cream">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </div>
      <span className="sr-only">{label}</span>
    </>
  )

  const cls =
    'vq-nav-icon group relative flex items-center justify-center w-10 h-10 rounded-full text-ink/70 transition-all duration-300 hover:text-ink hover:bg-ink/5'

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

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated } = useAuth()
  const { itemCount, openDrawer } = useCart()
  const wishlistCount = useWishlistStore((s) => s.items.length)
  const openMobileMenu = useUiStore((s) => s.openMobileMenu)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'vq-maison-header sticky top-0 z-50 w-full transition-all duration-500',
        scrolled && 'shadow-[0_10px_30px_rgba(60,45,20,0.07)]',
      )}
    >
      {/* Announcement ribbon */}
      <div className="flex h-8 items-center justify-center bg-ink px-4">
        <div className="flex items-center gap-5 text-[9px] font-medium uppercase tracking-[0.34em] text-cream/70">
          <span>Free Insured Shipping</span>
          <span className="vq-diamond" style={{ width: 4, height: 4 }} />
          <span className="hidden sm:inline">Hallmarked 18k Gold</span>
          <span className="vq-diamond hidden sm:inline-block" style={{ width: 4, height: 4 }} />
          <span>Lifetime Care</span>
        </div>
      </div>

      {/* Main nav — Menu · centred wordmark · actions */}
      <nav aria-label="Main navigation">
        <div className="vq-container grid h-[74px] grid-cols-[1fr_auto_1fr] items-center">

          {/* Left — Menu launcher */}
          <div className="flex items-center justify-start">
            <button
              onClick={openMobileMenu}
              className="group/menu flex items-center gap-2.5 text-ink"
              aria-label="Open menu"
            >
              <span className="relative flex h-6 w-6 flex-col items-center justify-center gap-[5px]">
                <span className="h-px w-5 bg-ink transition-all duration-300 group-hover/menu:w-6" />
                <span className="h-px w-6 bg-ink" />
                <span className="h-px w-5 bg-ink transition-all duration-300 group-hover/menu:w-6" />
              </span>
              <span className="hidden text-[11px] font-medium uppercase tracking-[0.28em] sm:inline">Menu</span>
            </button>
          </div>

          {/* Centre — wordmark */}
          <div className="flex items-center justify-center">
            <Link
              href={ROUTES.home}
              aria-label="Velquira home"
              className="vq-wordmark font-display text-[22px] leading-none md:text-[26px]"
              style={{ letterSpacing: '0.3em' }}
            >
              VELQUIRA
            </Link>
          </div>

          {/* Right — actions */}
          <div className="flex items-center justify-end gap-0.5 md:gap-1">
            <IconAction href={ROUTES.search} label="Search">
              <Search size={18} strokeWidth={1.4} />
            </IconAction>
            <IconAction
              href={isAuthenticated ? ROUTES.account : ROUTES.login}
              label={isAuthenticated ? 'Account' : 'Sign in'}
            >
              <User size={18} strokeWidth={1.4} />
            </IconAction>
            <IconAction href={ROUTES.wishlist} label="Wishlist" count={wishlistCount}>
              <Heart
                size={17}
                strokeWidth={1.4}
                fill={wishlistCount > 0 ? 'currentColor' : 'none'}
                className={wishlistCount > 0 ? 'text-gold' : ''}
              />
            </IconAction>
            <IconAction onClick={openDrawer} label="Bag" count={itemCount}>
              <ShoppingBag size={18} strokeWidth={1.4} />
            </IconAction>
          </div>
        </div>
      </nav>
    </header>
  )
}
