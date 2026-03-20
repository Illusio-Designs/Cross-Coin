'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, User, HelpCircle, ShoppingBag, Menu } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useUiStore } from '@/store/uiStore'
import { MegaMenu } from './MegaMenu'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

type MenuKey = 'men' | 'women' | 'sale'

const NAV_ITEMS: { label: string; key: MenuKey }[] = [
  { label: 'MEN', key: 'men' },
  { label: 'WOMEN', key: 'women' },
  { label: 'SALE', key: 'sale' },
]

export function Navbar() {
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const openDrawer = useCartStore((s) => s.openDrawer)
  const openMobileMenu = useUiStore((s) => s.openMobileMenu)

  const handleMouseEnter = useCallback((key: MenuKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveMenu(key)
  }, [])

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 100)
  }, [])

  const handleNavMouseEnter = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-full text-gray-800 transition-colors duration-150 hover:bg-black/5 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1'

  return (
    <>
      {/* Floating pill wrapper — fixed, 14px from top, 16px from sides */}
      <div
        className="fixed left-4 right-4 top-[50px] z-50"
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleNavMouseEnter}
      >
        {/* The pill */}
        <nav
          className="relative grid h-[52px] grid-cols-[auto_1fr_auto] items-center rounded-2xl bg-white pl-5 pr-3 shadow-[0_2px_20px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.06)]"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href={ROUTES.home}
            className="pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1"
            aria-label="Allbirds home"
          >
            <Image src="/logo.png" alt="Allbirds" width={100} height={32} priority />
          </Link>

          {/* Center nav links */}
          <div className="flex items-center justify-center gap-1">
            {NAV_ITEMS.map(({ label, key }) => (
              <button
                key={key}
                onMouseEnter={() => handleMouseEnter(key)}
                className={cn(
                  'flex h-[38px] items-center rounded-full px-4 text-[12px] font-medium uppercase tracking-[0.09em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1',
                  activeMenu === key
                    ? 'bg-black/5 text-brand-black'
                    : 'text-gray-800 hover:bg-black/5 hover:text-brand-black'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-0.5">
            {/* Text links */}
            <Link
              href={ROUTES.about}
              className="hidden h-9 items-center rounded-full px-2.5 text-[12px] font-normal text-gray-800 transition-colors duration-150 hover:bg-black/5 hover:text-brand-black lg:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            >
              About
            </Link>
            <Link
              href="/rerun"
              className="hidden h-9 items-center rounded-full px-2.5 text-[12px] font-normal text-gray-800 transition-colors duration-150 hover:bg-black/5 hover:text-brand-black lg:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            >
              ReRun
            </Link>

            {/* Icons */}
            <Link href={ROUTES.search} className={iconBtn} aria-label="Search">
              <Search size={16} strokeWidth={1.7} />
            </Link>
            <Link href={ROUTES.account} className={iconBtn} aria-label="Account">
              <User size={16} strokeWidth={1.7} />
            </Link>
            <Link href="#" className={iconBtn} aria-label="Help">
              <HelpCircle size={16} strokeWidth={1.7} />
            </Link>
            <button
              onClick={openDrawer}
              className={cn(iconBtn, 'relative')}
              aria-label={`Cart, ${itemCount} items`}
            >
              <ShoppingBag size={16} strokeWidth={1.7} />
              {itemCount > 0 && (
                <span className="absolute right-1 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-brand-black text-[8px] text-white">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={openMobileMenu}
              className={cn(iconBtn, 'lg:hidden')}
              aria-label="Open menu"
            >
              <Menu size={16} strokeWidth={1.7} />
            </button>
          </div>

          {/* MegaMenu drops below the pill */}
          <MegaMenu activeMenu={activeMenu} />
        </nav>
      </div>
    </>
  )
}
