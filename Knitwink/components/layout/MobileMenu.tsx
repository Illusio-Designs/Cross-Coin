'use client'

import Link from 'next/link'
import { useUiStore } from '@/store/uiStore'
import { Drawer } from '@/components/ui/Drawer'
import { NAV_LINKS } from '@/lib/constants'

export function MobileMenu() {
  const { mobileMenuOpen, closeMobileMenu } = useUiStore()

  return (
    <Drawer open={mobileMenuOpen} onClose={closeMobileMenu} side="left">
      <nav className="flex flex-col" aria-label="Mobile navigation">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={closeMobileMenu}
            className="border-b border-gray-200 px-6 py-4 text-sm uppercase tracking-wider text-brand-black transition-colors duration-150 hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </Drawer>
  )
}
