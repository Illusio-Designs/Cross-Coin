'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const SEGMENT_LABELS = {
  collections: 'Collections',
  products: 'Products',
  cart: 'Cart',
  checkout: 'Checkout',
  account: 'Account',
  orders: 'Orders',
  settings: 'Settings',
  login: 'Login',
  register: 'Register',
  about: 'About',
  journal: 'Journal',
  contact: 'Contact',
  search: 'Search',
  'size-guide': 'Size Guide',
  wishlist: 'Wishlist',
}

function formatSegment(seg) {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg]
  return decodeURIComponent(seg).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function Breadcrumb() {
  const pathname = usePathname()

  if (pathname === '/') return null

  let segments = pathname.split('/').filter(Boolean)

  // For policy pages, skip the "policies" segment — just show the policy name
  if (segments[0] === 'policies' && segments.length > 1) {
    segments = segments.slice(1)
  }

  const crumbs = segments.map((seg, i) => ({
    label: formatSegment(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))

  return (
    <nav
      aria-label="Breadcrumb"
      className="absolute left-0 right-0 z-40"
      style={{ top: 102 }}
    >
      <div className="px-5 md:px-8">
        <ol className="flex flex-wrap items-center gap-2 py-2.5 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-gray-100 hover:underline underline-offset-2 transition-colors">
              Home
            </Link>
          </li>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={crumb.href} className="flex items-center gap-2">
                <span className="text-gray-100">/</span>
                {isLast
                  ? <span className="text-gray-100 font-medium" aria-current="page">{crumb.label}</span>
                  : <Link href={crumb.href} className="hover:text-brand-white hover:underline underline-offset-2 transition-colors">{crumb.label}</Link>
                }
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
