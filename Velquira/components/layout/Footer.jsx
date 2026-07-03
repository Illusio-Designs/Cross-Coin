import Link from 'next/link'
import { Instagram, Facebook, Mail, Phone, MapPin, Clock } from 'lucide-react'
import { VelquiraLogo } from '@/components/brand/VelquiraLogo'
import { ROUTES } from '@/lib/constants'
import { SITE_TAGLINE } from '@/lib/brand'
import { NewsletterSignup } from './NewsletterSignup'

function WhatsAppIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.571a.75.75 0 0 0 .92.92l5.726-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.358l-.355-.211-3.676.944.962-3.578-.231-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
    </svg>
  )
}

const SHOP = [
  { label: 'Rings', href: '/products?category=Rings' },
  { label: 'Necklaces', href: '/products?category=Necklaces' },
  { label: 'Earrings', href: '/products?category=Earrings' },
  { label: 'Bracelets', href: '/products?category=Bracelets' },
  { label: 'Bridal', href: '/products?category=Bridal' },
  { label: 'All Pieces', href: ROUTES.products },
]

const HOUSE = [
  { label: 'The Atelier', href: ROUTES.about },
  { label: 'Lustre Journal', href: ROUTES.journal },
  { label: 'Collections', href: ROUTES.collections },
  { label: 'Contact', href: ROUTES.contact },
]

const CARE = [
  { label: 'Track Order', href: ROUTES.trackOrder },
  { label: 'Shipping', href: '/policies/shipping-policy' },
  { label: 'Returns', href: '/policies/cancellation-and-refund' },
  { label: 'Privacy', href: '/policies/privacy-policy' },
  { label: 'Terms', href: '/policies/terms-and-conditions' },
]

const SOCIALS = [
  { Icon: Instagram, href: 'https://instagram.com/velquira', label: 'Instagram' },
  { Icon: Facebook, href: 'https://facebook.com/velquira', label: 'Facebook' },
  { Icon: WhatsAppIcon, href: 'https://wa.me/919999999999', label: 'WhatsApp' },
]

function FooterColumn({ title, links }) {
  return (
    <div>
      <p className="mb-6 text-[9px] font-medium uppercase tracking-[0.38em] text-gold">{title}</p>
      <ul className="flex flex-col gap-3.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="group inline-flex items-center text-[13px] text-white/55 transition-colors hover:text-gold-light"
            >
              <span className="mr-0 h-px w-0 bg-gold transition-all duration-300 group-hover:mr-2.5 group-hover:w-4" />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden bg-brand-black text-white">
      {/* Watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 select-none font-display text-[22rem] font-light leading-none text-white/[0.02]"
      >
        V
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
      />

      {/* Newsletter — full-width gold inset card */}
      <section className="border-b border-white/[0.06] px-6 py-14 md:px-12 lg:px-20">
        <div className="mx-auto max-w-[1480px]">
          <div className="relative overflow-hidden rounded-sm border border-gold/25 bg-gradient-to-br from-white/[0.06] to-transparent p-8 md:p-12">
            <span className="vq-shine opacity-20" aria-hidden />
            <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-16">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-gold">Private List</p>
                <h2 className="vq-display mt-4 text-3xl text-white md:text-4xl">
                  Letters from
                  <span className="block italic text-gold-light">the atelier.</span>
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
                  Early access to edits, atelier notes, and invitations — never more than twice a month.
                </p>
              </div>
              <NewsletterSignup />
            </div>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section className="px-6 py-16 md:px-12 md:py-20 lg:px-20">
        <div className="mx-auto grid max-w-[1480px] gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <VelquiraLogo size="lg" variant="light" showWordmark />
            <p className="mt-2 text-[9px] uppercase tracking-[0.38em] text-white/35">{SITE_TAGLINE}</p>
            <p className="mt-6 max-w-xs font-display text-lg italic leading-relaxed text-white/55">
              Handcrafted fine jewellery — hallmarked gold and certified stones, made to become heirlooms.
            </p>
            <div className="mt-8 flex gap-3">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 text-white/60 transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold hover:text-brand-black"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-5">
            <FooterColumn title="Shop" links={SHOP} />
            <FooterColumn title="House" links={HOUSE} />
            <FooterColumn title="Care" links={CARE} />
          </div>

          {/* Atelier card */}
          <div className="lg:col-span-3">
            <div className="h-full border border-gold/20 bg-white/[0.03] p-6 backdrop-blur-sm">
              <p className="text-[9px] font-medium uppercase tracking-[0.38em] text-gold">Visit</p>
              <ul className="mt-5 flex flex-col gap-4 text-[13px] text-white/60">
                <li className="flex gap-3">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-gold/80" />
                  <span>
                    Bandra West
                    <br />
                    Mumbai 400050, India
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Clock size={14} className="shrink-0 text-gold/80" />
                  <span>By appointment · Mon–Sat</span>
                </li>
                <li>
                  <a href="mailto:hello@velquira.in" className="flex items-center gap-3 transition-colors hover:text-gold-light">
                    <Mail size={14} className="shrink-0 text-gold/80" />
                    hello@velquira.in
                  </a>
                </li>
                <li>
                  <a href="tel:+919999999999" className="flex items-center gap-3 transition-colors hover:text-gold-light">
                    <Phone size={14} className="shrink-0 text-gold/80" />
                    +91 99999 99999
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom strip */}
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1480px] flex-col items-center justify-between gap-3 px-6 py-5 text-[9px] uppercase tracking-[0.32em] text-white/35 md:flex-row md:px-12 lg:px-20">
          <p>© {year} Velquira · 19.0544° N, 72.8406° E</p>
          <p>
            Crafted by{' '}
            <a
              href="https://illusiodesigns.agency/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold/70 transition-colors hover:text-gold"
            >
              Illusio Designs
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
