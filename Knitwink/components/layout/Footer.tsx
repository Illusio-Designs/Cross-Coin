import Link from 'next/link'
import { ROUTES } from '@/lib/constants'

const footerLinks = [
  {
    heading: 'Shop',
    links: [
      { label: "Men's", href: '/collections/mens' },
      { label: "Women's", href: '/collections/womens' },
      { label: "Kids'", href: '/collections/kids' },
      { label: 'Sale', href: '/collections/sale' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: ROUTES.about },
      { label: 'Sustainability', href: ROUTES.sustainability },
      { label: 'Journal', href: ROUTES.journal },
      { label: 'Contact', href: ROUTES.contact },
    ],
  },
  {
    heading: 'Help',
    links: [
      { label: 'Size Guide', href: ROUTES.sizeGuide },
      { label: 'Returns', href: '/returns' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Track Order', href: ROUTES.orders },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-off-white">
      <div className="mx-auto max-w-site px-6 py-16 md:px-10 lg:px-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <p className="text-lg font-medium uppercase tracking-widest text-brand-black">
              Allbirds
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Natural materials. Thoughtful design. A better footprint.
            </p>
          </div>
          {footerLinks.map((section) => (
            <div key={section.heading}>
              <p className="text-xs font-medium uppercase tracking-widest text-gray-800">
                {section.heading}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 transition-colors duration-150 hover:text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-gray-200 pt-8 text-center">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Allbirds. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
