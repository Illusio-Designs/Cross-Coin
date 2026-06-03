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
  login: 'Login',
  register: 'Register',
  about: 'About',
  journal: 'Lustre',
  contact: 'Contact',
  search: 'Search',
  'size-guide': 'Size Guide',
  wishlist: 'Wishlist',
  policies: 'Policies',
}

function formatSegment(seg) {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg]
  return decodeURIComponent(seg)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Breadcrumb — refined editorial trail.
 * Tiny uppercase tracking, gold "›" separators, last item in deep cocoa.
 * Always renders against light ivory/cream grounds since every page now
 * uses those backgrounds.
 */
export function Breadcrumb() {
  const pathname = usePathname()

  if (pathname === '/') return null

  let segments = pathname.split('/').filter(Boolean)
  // Keep the "Policies" crumb so users can step back to the policy index.
  // (The detail page slug itself becomes the active leaf.)

  const crumbs = segments.map((seg, i) => ({
    label: formatSegment(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))

  return (
    <nav
      aria-label="Breadcrumb"
      className="relative z-10 w-full border-b border-gold/15 bg-ivory"
    >
      <div className="mx-auto max-w-[1480px] px-5 md:px-8">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 py-3 text-[10px] uppercase tracking-[0.28em]">
          <li>
            <Link
              href="/"
              className="text-brand-black/55 transition-colors duration-200 hover:text-gold"
            >
              Home
            </Link>
          </li>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={crumb.href} className="flex items-center gap-2">
                <span
                  className="font-display text-[13px] leading-none text-gold/60"
                  aria-hidden="true"
                >
                  ›
                </span>
                {isLast ? (
                  <span className="text-brand-black" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-brand-black/55 transition-colors duration-200 hover:text-gold"
                  >
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