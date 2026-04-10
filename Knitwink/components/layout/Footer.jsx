import Link from 'next/link';
import Image from 'next/image';
import { ROUTES } from '@/lib/constants';

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
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-off-white">
      <div className="mx-auto max-w-site px-6 py-16 md:px-10 lg:px-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand column with logo */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/logo.png"
              alt="Knitwink Logo"
              width={140}
              height={56}
              style={{ objectFit: 'contain' }}
              priority
            />
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Premium knitwear crafted with care. Comfort meets style in every stitch.
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

        {/* Bottom bar */}
        <div className="mt-12 border-t border-gray-200 pt-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <span className="text-xs text-gray-600">© {year} Knitwink. All rights reserved.</span>
          <span className="text-xs text-gray-500">
            Crafted with <span role="img" aria-label="love">❤️</span> by&nbsp;
            <a href="https://illusiodesigns.agency/" target="_blank" rel="noopener noreferrer" className="text-gray-700 underline underline-offset-2 hover:text-brand-black transition-colors duration-150">
              Illusio Designs
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
