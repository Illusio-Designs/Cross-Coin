import Link from 'next/link'
import { Mail, Phone, MapPin, Instagram, Facebook } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

// WhatsApp SVG icon (lucide doesn't have one)
function WhatsAppIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.571a.75.75 0 0 0 .92.92l5.726-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.358l-.355-.211-3.676.944.962-3.578-.231-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </svg>
  )
}

// Temporarily hidden — restore the Shop column when ready
// const SHOP_LINKS = [
//   { label: "Men's Collection",   href: '/collections/mens' },
//   { label: "Women's Collection", href: '/collections/womens' },
//   { label: 'New Arrivals',       href: '/collections' },
//   { label: 'Sale',               href: '/collections/sale' },
// ]

const COMPANY_LINKS = [
  { label: 'Collections',      href: '/collections' },
  { label: 'All Products',     href: '/products' },
  { label: 'Contact Us',       href: ROUTES.contact },
  { label: 'Track Your Order', href: '/track-order' },
]

const POLICY_LINKS = [
  { label: 'Privacy Policy',       href: '/policies/privacy-policy' },
  { label: 'Terms & Conditions',   href: '/policies/terms-and-conditions' },
  { label: 'Shipping Policy',      href: '/policies/shipping-policy' },
  { label: 'Cancellation & Refund', href: '/policies/cancellation-and-refund' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-brand-black text-white">

      {/* Column grid: Brand | Company | Policies | Contact (Shop temporarily hidden) */}
      <div className="px-6 py-16 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-10">

          {/* Col 1 — Brand */}
          <div className="flex flex-col items-start gap-5 sm:col-span-2 md:col-span-1">
            <img src="/knitwinklogo.webp" alt="Knitwink" className="h-16 w-auto object-contain brightness-0 invert" />
            <p className="text-sm leading-relaxed text-white/55 max-w-[220px]">
              Premium knitwear crafted with care. Comfort meets style in every stitch.
            </p>
            <div className="flex items-center gap-2.5">
              {[
                { icon: Instagram,    href: 'https://instagram.com/knitwink', label: 'Instagram' },
                { icon: Facebook,     href: 'https://facebook.com/knitwink',  label: 'Facebook' },
                { icon: WhatsAppIcon, href: 'https://wa.me/919999999999',     label: 'WhatsApp' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/40 transition-all hover:border-white/40 hover:text-white"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Shop — temporarily hidden, restore when ready
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
          */}

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

          {/* Col 4 — Policies */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-5">Policies</p>
            <ul className="flex flex-col gap-3">
              {POLICY_LINKS.map((l) => (
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
