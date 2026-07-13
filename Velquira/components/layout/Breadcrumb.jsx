'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const SEGMENT_LABELS = {
  collections: 'Collections',
  products: 'Products',
  cart: 'Cart',
  account: 'Account',
  orders: 'Orders',
  settings: 'Settings',
  login: 'Sign In',
  register: 'Register',
  about: 'About',
  journal: 'Journal',
  contact: 'Contact',
  search: 'Search',
  wishlist: 'Wishlist',
  policies: 'Policies',
}

function formatSegment(seg) {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg]
  return decodeURIComponent(seg).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function Breadcrumb() {
  const pathname = usePathname()
  if (pathname === '/' || pathname === '/login' || pathname === '/register') return null

  const segments = pathname.split('/').filter(Boolean)
  const crumbs = segments.map((seg, i) => ({
    label: formatSegment(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))

  return (
    <nav aria-label="Breadcrumb" className="border-b border-line bg-paper">
      <div className="vq-container flex items-center py-3">
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] uppercase tracking-[0.34em]">
          <li>
            <Link href="/" className="text-brand-black/40 transition-colors hover:text-gold">
              Home
            </Link>
          </li>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={crumb.href} className="flex items-center gap-3">
                <span className="vq-diamond opacity-50" style={{ width: 3, height: 3 }} aria-hidden />
                {isLast ? (
                  <span className="font-display text-[11px] font-semibold normal-case tracking-normal text-brand-black" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="text-brand-black/40 transition-colors hover:text-gold">
                    {crumb.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
