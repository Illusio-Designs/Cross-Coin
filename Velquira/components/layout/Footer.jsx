import Link from 'next/link'
import { Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { NewsletterSignup } from './NewsletterSignup'

function WhatsAppIcon({ size = 15 }) {
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
  { label: 'All Products', href: ROUTES.products },
]

const HOUSE = [
  { label: 'About Us', href: ROUTES.about },
  { label: 'Journal', href: ROUTES.journal },
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
  { Icon: WhatsAppIcon, href: 'https://wa.me/919712891700', label: 'WhatsApp' },
]

function FooterColumn({ title, links }) {
  return (
    <div>
      <p className="mb-5 text-[9px] font-semibold uppercase tracking-[0.34em] text-gold">{title}</p>
      <ul className="flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-[13.5px] text-cream/55 transition-colors duration-300 hover:text-cream"
            >
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
    <footer className="vq-night relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      {/* ── Newsletter, centred ─────────────────────────────────────── */}
      <section className="vq-container pt-20 pb-14 text-center md:pt-24">
        <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-gold">Newsletter</p>
        <h2 className="vq-display mt-5 text-cream" style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)', lineHeight: 1.05 }}>
          Join Our Newsletter
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[13.5px] leading-relaxed text-cream/50">
          Early access to new pieces, studio updates and special invitations — never more than twice a month.
        </p>
        <div className="mx-auto mt-8 max-w-md">
          <NewsletterSignup />
        </div>
      </section>

      {/* ── Giant wordmark statement ────────────────────────────────── */}
      <div className="select-none px-4 text-center" aria-hidden>
        <p className="vq-display leading-[0.8] text-cream/[0.9]" style={{ fontSize: 'clamp(3.4rem,17vw,15rem)', letterSpacing: '-0.01em' }}>
          Velquira<span className="align-top text-[0.24em] text-gold">✦</span>
        </p>
      </div>

      {/* ── Link row + contact ──────────────────────────────────────── */}
      <section className="border-t border-cream/10 py-14">
        <div className="vq-container grid grid-cols-2 gap-10 md:grid-cols-4">
          <FooterColumn title="Shop" links={SHOP} />
          <FooterColumn title="Company" links={HOUSE} />
          <FooterColumn title="Help" links={CARE} />
          <div>
            <p className="mb-5 text-[9px] font-semibold uppercase tracking-[0.34em] text-gold">Contact</p>
            <ul className="flex flex-col gap-3.5 text-[13px] text-cream/55">
              <li className="flex gap-2.5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-gold/70" />
                <span>Bandra West<br />Mumbai 400050</span>
              </li>
              <li>
                <a href="mailto:hello@velquira.in" className="flex items-center gap-2.5 transition-colors hover:text-cream">
                  <Mail size={14} className="shrink-0 text-gold/70" /> hello@velquira.in
                </a>
              </li>
              <li>
                <a href="tel:+919712891700" className="flex items-center gap-2.5 transition-colors hover:text-cream">
                  <Phone size={14} className="shrink-0 text-gold/70" /> +91 97128 91700
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className="border-t border-cream/10">
        <div className="vq-container flex flex-col items-center gap-5 py-7 md:flex-row md:justify-between">
          <div className="flex gap-3">
            {SOCIALS.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold hover:text-gold"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-cream/40">© {year} Velquira · Fine Jewellery</p>
          <p className="text-[10px] uppercase tracking-[0.28em] text-cream/40">
            Crafted by{' '}
            <a href="https://illusiodesigns.agency/" target="_blank" rel="noopener noreferrer" className="text-gold/70 transition-colors hover:text-gold">
              Illusio
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
