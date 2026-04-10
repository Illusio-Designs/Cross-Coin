'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, User, HelpCircle, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUiStore } from '@/store/uiStore';
import { MegaMenu } from './MegaMenu';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';



const NAV_ITEMS = [
{ label: 'MEN', key: 'men' },
{ label: 'WOMEN', key: 'women' },
{ label: 'SALE', key: 'sale' }];


export function Navbar() {
  const [activeMenu, setActiveMenu] = useState(null);
  const closeTimer = useRef(null);
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const openDrawer = useCartStore((s) => s.openDrawer);
  const openMobileMenu = useUiStore((s) => s.openMobileMenu);

  const handleMouseEnter = useCallback((key) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMenu(key);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 100);
  }, []);

  const handleNavMouseEnter = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-full text-gray-800 transition-colors duration-150 hover:bg-black/5 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1';

  return (
    <>
      {/* Floating pill wrapper — fixed, 14px from top, 16px from sides */}
      <div
        className="fixed left-4 right-4 top-[50px] z-50"
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleNavMouseEnter}>
        
        {/* The pill */}
        <nav
          className="relative grid h-[52px] grid-cols-[auto_1fr_auto] items-center rounded-2xl bg-white pl-3 pr-3 shadow-[0_2px_20px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.06)]"
          aria-label="Main navigation">
          
          {/* Left: hamburger on mobile, logo on desktop */}
          <div className="flex items-center">
            {/* Mobile hamburger */}
            <button
              onClick={openMobileMenu}
              className={cn(iconBtn, 'lg:hidden')}
              aria-label="Open menu"
              aria-expanded={false}>
              
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round">
                
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            </button>

            {/* Desktop logo */}
            <Link
              href={ROUTES.home}
              className="hidden lg:block pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1"
              aria-label="Allbirds home">
              
              <Image src="/logo.png" alt="Allbirds" width={100} height={32} priority />
            </Link>
          </div>

          {/* Mobile centered logo */}
          <div className="absolute left-1/2 -translate-x-1/2 lg:hidden">
            <Link
              href={ROUTES.home}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1"
              aria-label="Allbirds home">
              
              <Image src="/logo.png" alt="Allbirds" width={90} height={28} priority />
            </Link>
          </div>

          {/* Center — desktop nav links / mobile logo */}
          <div className="flex items-center justify-center gap-1">
            {/* Desktop nav links */}
            {NAV_ITEMS.map(({ label, key }) =>
            <button
              key={key}
              onMouseEnter={() => handleMouseEnter(key)}
              className={cn(
                'hidden lg:flex h-[38px] items-center rounded-full px-4 text-[12px] font-medium uppercase tracking-[0.09em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1',
                activeMenu === key ?
                'bg-black/5 text-brand-black' :
                'text-gray-800 hover:bg-black/5 hover:text-brand-black'
              )}>
              
                {label}
              </button>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-0.5">
            {/* Desktop text links */}
            <Link
              href={ROUTES.about}
              className="hidden h-9 items-center rounded-full px-2.5 text-[12px] font-normal text-gray-800 transition-colors duration-150 hover:bg-black/5 hover:text-brand-black lg:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">
              
              About
            </Link>
            <Link
              href="/rerun"
              className="hidden h-9 items-center rounded-full px-2.5 text-[12px] font-normal text-gray-800 transition-colors duration-150 hover:bg-black/5 hover:text-brand-black lg:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">
              
              ReRun
            </Link>

            {/* Search — always visible */}
            <Link href={ROUTES.search} className={iconBtn} aria-label="Search">
              <Search size={18} strokeWidth={1.5} />
            </Link>

            {/* Account — desktop only */}
            <Link href={ROUTES.account} className={cn(iconBtn, 'hidden lg:flex')} aria-label="Account">
              <User size={16} strokeWidth={1.7} />
            </Link>
            <Link href="#" className={cn(iconBtn, 'hidden lg:flex')} aria-label="Help">
              <HelpCircle size={16} strokeWidth={1.7} />
            </Link>

            {/* Cart — always visible */}
            <button
              onClick={openDrawer}
              className={cn(iconBtn, 'relative')}
              aria-label={`Cart, ${itemCount} items`}>
              
              <ShoppingBag size={18} strokeWidth={1.5} />
              {itemCount > 0 &&
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-black text-[8px] font-medium text-white">
                  {itemCount}
                </span>
              }
            </button>
          </div>

          {/* MegaMenu drops below the pill */}
          <MegaMenu activeMenu={activeMenu} />
        </nav>
      </div>
    </>);

}