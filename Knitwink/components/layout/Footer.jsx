import Link from 'next/link'
import Image from 'next/image'
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

const SHOP_LINKS = [
  { label: "Men's Collection",   href: '/collections/mens' },
  { label: "Women's Collection", href: '/collections/womens' },
  { label: 'New Arrivals',       href: '/collections' },
  { label: 'Sale',               href: '/collections/sale' },
]

const COMPANY_LINKS = [
  { label: 'About Knitwink', href: ROUTES.about },
  { label: 'Sustainability',  href: ROUTES.sustainability },
  { label: 'Journal',         href: ROUTES.journal },
  { label: 'Contact Us',      href: ROUTES.contact },
]

const HELP_LINKS = [
  { label: 'Size Guide',          href: ROUTES.sizeGuide },
  { label: 'Track Your Order',    href: ROUTES.orders },
  { label: 'Returns & Exchanges', href: '/returns' },
  { label: 'FAQ',                 href: '/faq' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-brand-black text-white">

      {/* 5-column grid: Brand | Shop | Company | Help | Contact */}
      <div className="px-6 py-16 md:px-10 lg:px-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-5">

          {/* Col 1 — Brand (left-aligned) */}
          <div className="col-span-2 flex flex-col items-start gap-5 md:col-span-1">
            <Image
              src="/logo.png"
              alt="Knitwink"
              width={130}
              height={44}
              className="h-16 w-auto object-contain brightness-0 invert"
              priority
            />
            <p className="text-sm leading-relaxed text-white/55 max-w-[220px]">
              Premium knitwear crafted with care. Comfort meets style in every stitch.
            </p>
            <div className="flex items-center gap-2.5">
              {[
                { icon: Instagram, href: '#', label: 'Instagram' },
                { icon: Facebook,  href: '#', label: 'Facebook' },
                { icon: Twitter,   href: '#', label: 'Twitter' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/40 transition-all hover:border-white/40 hover:text-white"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Shop */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-5">Shop</p>
            <ul className="flex flex-col gap-3">
              {SHOP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/55 transition-colors hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Company */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-5">Company</p>
            <ul className="flex flex-col gap-3">
              {COMPANY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/55 transition-colors hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Help */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-5">Help</p>
            <ul className="flex flex-col gap-3">
              {HELP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/55 transition-colors hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 5 — Contact (last) */}
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Contact</p>
            <a href="mailto:support@knitwink.com" className="flex items-start gap-2.5 text-sm text-white/55 transition-colors hover:text-white">
              <Mail size={13} className="mt-0.5 shrink-0 text-white/30" />
              support@knitwink.com
            </a>
            <a href="tel:+919999999999" className="flex items-center gap-2.5 text-sm text-white/55 transition-colors hover:text-white">
              <Phone size={13} className="shrink-0 text-white/30" />
              +91 99999 99999
            </a>
            <div className="flex items-start gap-2.5 text-sm text-white/55">
              <MapPin size={13} className="mt-0.5 shrink-0 text-white/30" />
              <span>Mumbai, Maharashtra,<br />India</span>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 px-6 py-5 md:px-10 lg:px-16">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <span className="text-xs text-white/35">© {year} Knitwink. All rights reserved.</span>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-white/35">
            <Link href="/policies/privacy" className="transition-colors hover:text-white/60">Privacy Policy</Link>
            <span>·</span>
            <Link href="/policies/terms" className="transition-colors hover:text-white/60">Terms of Use</Link>
            <span>·</span>
            <span>Crafted with</span>
            <span className="text-red-400">❤</span>
            <span>by</span>
            <a
              href="https://illusiodesigns.agency/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white transition-colors hover:text-white/80 underline underline-offset-2"
            >
              Illusio Designs
            </a>
          </div>
        </div>
      </div>

    </footer>
  )
}
