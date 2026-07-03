'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { VelquiraLogo } from '@/components/brand/VelquiraLogo'
import { useUiStore } from '@/store/uiStore'
import { NAV_LINKS, JEWELLERY_CATEGORIES, ROUTES } from '@/lib/constants'

const FOOTER_LINKS = [
  { label: 'Contact', href: ROUTES.contact },
  { label: 'Track Order', href: ROUTES.trackOrder },
  { label: 'Wishlist', href: ROUTES.wishlist },
  { label: 'Account', href: ROUTES.account },
]

export function MobileMenu() {
  const { mobileMenuOpen, closeMobileMenu } = useUiStore()

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKey = (e) => e.key === 'Escape' && closeMobileMenu()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen, closeMobileMenu])

  return (
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileMenu}
            className="fixed inset-0 z-[9998] bg-brand-black/50 backdrop-blur-sm"
            aria-hidden
          />

          <motion.aside
            key="panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.38, ease: [0.22, 0.65, 0.3, 1] }}
            className="fixed inset-y-0 left-0 z-[9999] flex w-full max-w-[min(100%,380px)] flex-col bg-ivory"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex items-center justify-between border-b border-gold/25 px-6 py-5">
              <VelquiraLogo layout="stacked" size="sm" showTagline />
              <button
                onClick={closeMobileMenu}
                className="flex h-10 w-10 items-center justify-center border border-gold/30 text-brand-black/70 transition-colors hover:border-gold hover:text-gold"
                aria-label="Close"
              >
                <X size={18} strokeWidth={1.3} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8">
              <p className="vq-eyebrow">Collections</p>
              <ul className="mt-5 space-y-1">
                {JEWELLERY_CATEGORIES.map((cat, i) => (
                  <li key={cat.href}>
                    <Link
                      href={cat.href}
                      onClick={closeMobileMenu}
                      className="group flex items-baseline gap-3 border-b border-gold/10 py-3"
                    >
                      <span className="text-[10px] tabular-nums text-gold/55">{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-display text-2xl text-brand-black transition-colors group-hover:text-gold-deep">
                        {cat.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="vq-eyebrow mt-10">Explore</p>
              <ul className="mt-4 space-y-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMobileMenu}
                      className="font-display text-lg text-brand-black/75 transition-colors hover:text-gold-deep"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gold/25 bg-cream/50 px-6 py-5">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMobileMenu}
                      className="text-[9px] uppercase tracking-[0.32em] text-brand-black/50 hover:text-gold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
