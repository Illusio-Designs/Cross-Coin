'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

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

// Pages with dark hero backgrounds — breadcrumb text should be white
const DARK_PAGES = ['/contact', '/journal', '/about', '/policies']

export function Breadcrumb() {
  const pathname = usePathname()

  if (pathname === '/') return null

  let segments = pathname.split('/').filter(Boolean)
  if (segments[0] === 'policies' && segments.length > 1) {
    segments = segments.slice(1)
  }

  const crumbs = segments.map((seg, i) => ({
    label: formatSegment(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))

  const isDark = DARK_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'))

  const textCls = isDark ? 'text-white/50' : 'text-gray-500'
  const activeCls = isDark ? 'text-white/80 font-medium' : 'text-brand-black font-medium'
  const sepCls = isDark ? 'text-white/30' : 'text-gray-300'
  const hoverCls = isDark ? 'hover:text-white hover:underline' : 'hover:text-brand-black hover:underline'

  return (
    <nav
      aria-label="Breadcrumb"
      className="absolute left-0 right-0 z-40"
      style={{ top: 102 }}
    >
      <div className="px-5 md:px-8">
        <ol className={`flex flex-wrap items-center gap-2 py-2.5 text-sm ${textCls}`}>
          <li>
            <Link href="/" className={`underline-offset-2 transition-colors ${hoverCls}`}>Home</Link>
          </li>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={crumb.href} className="flex items-center gap-2">
                <span className={sepCls}>/</span>
                {isLast
                  ? <span className={activeCls} aria-current="page">{crumb.label}</span>
                  : <Link href={crumb.href} className={`underline-offset-2 transition-colors ${hoverCls}`}>{crumb.label}</Link>
                }
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
