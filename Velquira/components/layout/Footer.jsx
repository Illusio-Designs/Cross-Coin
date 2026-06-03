import Link from 'next/link'
import { Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { NewsletterSignup } from './NewsletterSignup'

// WhatsApp SVG icon (lucide doesn't include one)
function WhatsAppIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.571a.75.75 0 0 0 .92.92l5.726-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.358l-.355-.211-3.676.944.962-3.578-.231-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
    </svg>
  )
}

const SHOP_LINKS = [
  { label: 'Rings',     href: '/products?category=Rings' },
  { label: 'Necklaces', href: '/products?category=Necklaces' },
  { label: 'Earrings',  href: '/products?category=Earrings' },
  { label: 'Bracelets', href: '/products?category=Bracelets' },
  { label: 'Bridal',    href: '/products?category=Bridal' },
]

const ABOUT_LINKS = [
  { label: 'About',   href: ROUTES.about },
  { label: 'Lustre',  href: ROUTES.journal },
  { label: 'Contact', href: ROUTES.contact },
]

const CARE_LINKS = [
  { label: 'Track Order',           href: ROUTES.trackOrder },
  { label: 'Shipping Policy',       href: '/policies/shipping-policy' },
  { label: 'Cancellation & Refund', href: '/policies/cancellation-and-refund' },
  { label: 'Privacy',               href: '/policies/privacy-policy' },
  { label: 'Terms',                 href: '/policies/terms-and-conditions' },
]

const SOCIALS = [
  { Icon: Instagram,    href: 'https://instagram.com/velquira', label: 'Instagram' },
  { Icon: Facebook,     href: 'https://facebook.com/velquira',  label: 'Facebook' },
  { Icon: WhatsAppIcon, href: 'https://wa.me/919999999999',     label: 'WhatsApp' },
]

function LinkColumn({ heading, links }) {
  return (
    <div>
      <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.32em] text-gold">
        {heading}
      </p>
      <ul className="flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="group inline-flex items-center text-[13px] text-white/65 transition-colors duration-300 hover:text-gold-light"
            >
              <span
                aria-hidden
                className="mr-0 inline-block h-px w-0 bg-gold transition-all duration-300 ease-out group-hover:mr-2 group-hover:w-3"
              />
              <span>{l.label}</span>
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
    <footer className="bg-brand-black text-white">
      {/* Top band — newsletter line */}
      <section className="border-b border-white/10 px-6 py-8 md:px-10 lg:px-16">
        <div className="mx-auto flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-10">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-gold">
            Letter from the atelier
          </p>
          <div className="w-full md:max-w-md">
            <NewsletterSignup />
          </div>
        </div>
      </section>

      {/* Main band — 5 columns on desktop */}
      <section className="px-6 py-14 md:px-10 md:py-16 lg:px-16">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">

            {/* Col 1 — Brand block */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <span className="vq-diamond" aria-hidden="true" />
                <span className="vq-wordmark text-3xl font-medium uppercase leading-none">
                  Velquira
                </span>
              </div>
              <p className="mt-5 max-w-[260px] font-display text-[15px] italic leading-relaxed text-white/65">
                Fine jewellery, handcrafted to be worn for generations.
              </p>
              <div className="mt-6 flex items-center gap-3">
                {SOCIALS.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="group flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 text-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold hover:bg-gold hover:text-brand-black"
                  >
                    <Icon size={14} />
                  </a>
                ))}
              </div>
            </div>

            {/* Col 2 — Shop */}
            <LinkColumn heading="Shop" links={SHOP_LINKS} />

            {/* Col 3 — About */}
            <LinkColumn heading="About" links={ABOUT_LINKS} />

            {/* Col 4 — Care */}
            <LinkColumn heading="Care" links={CARE_LINKS} />

            {/* Col 5 — Contact */}
            <div>
              <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.32em] text-gold">
                Contact
              </p>
              <ul className="flex flex-col gap-3.5">
                <li>
                  <a
                    href="mailto:hello@velquira.in"
                    className="group flex items-start gap-2.5 text-[13px] text-white/65 transition-colors duration-300 hover:text-gold-light"
                  >
                    <Mail size={13} className="mt-0.5 shrink-0 text-gold/70 transition-colors group-hover:text-gold" />
                    <span>hello@velquira.in</span>
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+919999999999"
                    className="group flex items-center gap-2.5 text-[13px] text-white/65 transition-colors duration-300 hover:text-gold-light"
                  >
                    <Phone size={13} className="shrink-0 text-gold/70 transition-colors group-hover:text-gold" />
                    <span>+91 99999 99999</span>
                  </a>
                </li>
                <li className="flex items-start gap-2.5 text-[13px] leading-relaxed text-white/65">
                  <MapPin size={13} className="mt-0.5 shrink-0 text-gold/70" />
                  <span>
                    Bandra West,<br />
                    Mumbai 400050, India
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom band — copyright strip */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-2 px-6 py-4 text-[10px] md:flex-row md:px-10 md:py-3 lg:px-16">
          <p className="uppercase tracking-[0.25em] text-white/45">
            © {year} Velquira — Fine Jewellery
          </p>
          <p className="uppercase tracking-[0.25em] text-white/40">
            Crafted by{' '}
            <a
              href="https://illusiodesigns.agency/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-light/80 transition-colors hover:text-gold"
            >
              Illusio Designs
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}