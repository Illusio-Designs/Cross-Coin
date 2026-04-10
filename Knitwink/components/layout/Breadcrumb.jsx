'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

// Human-readable labels for known path segments
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
  sustainability: 'Sustainability',
  journal: 'Journal',
  contact: 'Contact',
  search: 'Search',
  'size-guide': 'Size Guide',
  wishlist: 'Wishlist',
  quiz: 'Style Quiz'
};

function formatSegment(segment) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  // Handle dynamic slugs/handles — decode URI + title-case
  return decodeURIComponent(segment).
  replace(/-/g, ' ').
  replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumb() {
  const pathname = usePathname();

  // Hide on homepage
  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((seg, i) => ({
    label: formatSegment(seg),
    href: '/' + segments.slice(0, i + 1).join('/')
  }));

  return (
    <nav
      aria-label="Breadcrumb"
      className="w-full bg-white border-b border-gray-200">
      
      <div className="mx-auto max-w-[1440px] px-6 md:px-10 lg:px-16">
        <ol className="flex items-center gap-1 py-2.5 text-xs text-gray-600 flex-wrap">
          {/* Home */}
          <li>
            <Link
              href="/"
              className="transition-colors duration-150 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded">
              
              Home
            </Link>
          </li>

          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1">
                <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
                {isLast ?
                <span className="text-brand-black font-medium" aria-current="page">
                    {crumb.label}
                  </span> :

                <Link
                  href={crumb.href}
                  className="transition-colors duration-150 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded">
                  
                    {crumb.label}
                  </Link>
                }
              </li>);

          })}
        </ol>
      </div>
    </nav>);

}