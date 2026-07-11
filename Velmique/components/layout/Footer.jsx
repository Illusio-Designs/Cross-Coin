import Link from 'next/link';
import { Instagram, Facebook, Mail, Phone, ArrowUpRight } from 'lucide-react';

// WhatsApp SVG icon (lucide doesn't include one)
function WhatsAppIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.571a.75.75 0 0 0 .92.92l5.726-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.358l-.355-.211-3.676.944.962-3.578-.231-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </svg>
  );
}

const SOCIAL_LINKS = [
  { Icon: Instagram,    href: 'https://instagram.com/', label: 'Instagram' },
  { Icon: Facebook,     href: 'https://facebook.com/',  label: 'Facebook'  },
  { Icon: WhatsAppIcon, href: 'https://wa.me/919712891700',       label: 'WhatsApp'  },
];

export default function Footer() {
  return (
    <footer className="relative w-full bg-[var(--dark)] overflow-hidden">

      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative grid grid-cols-12 gap-6 px-6 md:px-12 lg:px-20 py-12 md:py-20 max-w-[1600px] mx-auto">

          {/* TOP ROW — contact pill (left) + customer-care links (right).
              Header already covers Shop / Collections / About / Blog
              — footer only carries the things that DON'T live in the header. */}
          <div className="col-span-12 flex items-start justify-between flex-wrap gap-6 mb-6">
            <Link href="/contact" className="bg-white/95 text-[var(--ink)] rounded-full px-5 py-2 text-[10px] tracking-[0.25em] uppercase font-body font-medium hover:bg-[var(--gold)] hover:text-[var(--ink)] transition-colors">
              Contact
            </Link>

            <nav className="flex flex-col gap-2 items-end">
              <p className="text-white/40 text-[10px] tracking-[0.35em] uppercase font-body mb-1">Customer Care</p>
              {[
                ['Track Your Order',       '/track-order'],
                ['Shipping Policy',        '/shipping-returns'],
                ['Cancellation & Refund',  '/cancellation-refund'],
              ].map(([label, href]) => (
                <Link key={label} href={href}
                  className="text-white/80 hover:text-[var(--gold-light)] text-sm font-body transition-colors">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* LEFT — brand image */}
          <div className="col-span-12 md:col-span-3">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden">
              <img
                src="/footer.webp"
                alt="Velmique"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-3 flex flex-col justify-between gap-6">
            {/* Email signup pill */}
            <div className="bg-white/5 border border-white/15 rounded-full flex items-center pl-5 pr-1 py-1 backdrop-blur-sm">
              <input
                type="email"
                placeholder="Enter Your Email"
                className="bg-transparent flex-1 text-white placeholder:text-white/40 text-sm font-body outline-none py-2"
              />
              <button className="bg-[var(--gold)] hover:bg-white text-[var(--ink)] rounded-full w-9 h-9 flex items-center justify-center transition-colors shrink-0">
                <ArrowUpRight size={16} strokeWidth={2} />
              </button>
            </div>

            <div>
              <p className="text-white/50 text-xs tracking-[0.05em] leading-relaxed font-body max-w-[220px]">
                Hand-blended extraits built on rare absolutes, aged oud and sandalwood.
              </p>
            </div>

            <div>
              <p className="font-serif italic text-white/85 text-base leading-snug">
                Maison de Parfum<br />for Modern Living
              </p>
              <p className="text-white/40 text-[10px] tracking-[0.25em] uppercase font-body mt-3">
                Royal Plaza, Panchasar Road<br />Morbi - 363641, Gujarat, India
              </p>
            </div>

            <Link href="/shop" className="pill-cta pill-cta-dark w-fit">
              See More
              <ArrowUpRight size={13} strokeWidth={1.6} />
            </Link>
          </div>

          {/* RIGHT — huge editorial brand text */}
          <div className="col-span-12 md:col-span-6 flex flex-col justify-between min-h-[300px] md:min-h-0">
            <div className="flex-1 flex items-center justify-end">
              <h2
                className="font-display text-right leading-[0.82] tracking-[-0.02em]"
                style={{ fontSize: 'clamp(6rem, 9vw, 8.5rem)' }}
              >
                <span className="block text-white/90">ETERNAL</span>
                <span
                  className="block"
                  style={{
                    WebkitTextStroke: '1.5px rgba(255,255,255,0.25)',
                    color: 'transparent',
                  }}
                >
                  ALLURE
                </span>
              </h2>
            </div>

            <div className="flex items-end justify-between mt-8 gap-4 flex-wrap">
              <div className="flex gap-3">
                {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="w-9 h-9 rounded-full border border-white/20 hover:border-[var(--gold)] flex items-center justify-center text-white/60 hover:text-[var(--gold-light)] transition-all">
                    <Icon size={14} />
                  </a>
                ))}
              </div>
              <div className="flex flex-col items-end gap-1.5 text-white/40 text-xs font-body">
                <a href="mailto:hello@velmique.in" className="flex items-center gap-2 hover:text-[var(--gold-light)] transition-colors">
                  <Mail size={12} /> hello@velmique.in
                </a>
                <a href="tel:+919712891700" className="flex items-center gap-2 hover:text-[var(--gold-light)] transition-colors">
                  <Phone size={12} /> +91 97128 91700
                </a>
              </div>
            </div>
          </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/10">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-xs font-body tracking-wider">
            © 2026 Velmique. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-white/50 text-xs font-body tracking-wider">
            <Link href="/privacy-policy" className="hover:text-[var(--gold-light)] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[var(--gold-light)] transition-colors">Terms Of Use</Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-body tracking-wider text-white/40">
            <span>Crafted with</span>
            <span className="text-[var(--gold-light)]">❤</span>
            <span>by</span>
            <a
              href="https://illusiodesigns.agency/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white/85 underline underline-offset-2 transition-colors hover:text-[var(--gold-light)]"
            >
              Illusio Designs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
