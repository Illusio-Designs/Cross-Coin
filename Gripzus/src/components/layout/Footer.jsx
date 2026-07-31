import Link from 'next/link';
import { toastSubscribed, toastValidationError } from '../../utils/toast';

/* Gripzus footer — editorial gallery. Light, quiet, tiny type. Minimal
   newsletter, three link columns, a slim bottom bar. */

const CARE_LINKS = [
  { label: 'Privacy Policy',        href: '/policies/privacy-policy' },
  { label: 'Terms & Conditions',    href: '/policies/terms-and-conditions' },
  { label: 'Shipping Policy',       href: '/policies/shipping-policy' },
  { label: 'Cancellation & Refund', href: '/policies/cancellation-and-refund' },
];

const HOUSE_LINKS = [
  { label: 'Our Story',   href: '/about' },
  { label: 'Journal',     href: '/journal' },
  { label: 'Track Order', href: '/track-order' },
  { label: 'Contact',     href: '/contact' },
];

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/gripzus' },
  { label: 'Facebook',  href: 'https://facebook.com/gripzus'  },
  { label: 'WhatsApp',  href: 'https://wa.me/919712891700'    },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-paper border-t border-ink">
      <div className="wrap pt-16 md:pt-20 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-6 gap-y-12">

          {/* Newsletter */}
          <div className="col-span-2 md:col-span-5">
            <p className="eyebrow mb-4">Newsletter</p>
            <p className="h-display text-xl md:text-2xl max-w-xs leading-snug mb-6">
              New drops and stories, twice a month.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const email = e.target.email.value.trim();
                if (!email) { toastValidationError('Please enter your email address.'); return; }
                toastSubscribed();
                e.target.reset();
              }}
              className="flex items-center border-b border-ink max-w-sm"
            >
              <input
                type="email"
                name="email"
                placeholder="Email address"
                className="flex-1 bg-transparent text-ink placeholder:text-ink-muted text-sm py-2.5 outline-none"
              />
              <button type="submit" className="text-[11px] uppercase tracking-[0.14em] py-2.5 pl-4 hover:opacity-55 transition-opacity">
                Subscribe →
              </button>
            </form>
          </div>

          <div className="md:col-span-1 hidden md:block" />

          {/* Columns */}
          <div className="md:col-span-2">
            <p className="eyebrow text-ink-muted mb-4">Care</p>
            <ul className="space-y-2.5">
              {CARE_LINKS.map((l) => (
                <li key={l.label}><Link href={l.href} className="text-[13px] text-ink-soft hover:text-ink transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            <p className="eyebrow text-ink-muted mb-4">House</p>
            <ul className="space-y-2.5">
              {HOUSE_LINKS.map((l) => (
                <li key={l.label}><Link href={l.href} className="text-[13px] text-ink-soft hover:text-ink transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            <p className="eyebrow text-ink-muted mb-4">Contact</p>
            <ul className="space-y-2.5 text-[13px] text-ink-soft">
              <li><a href="mailto:support@gripzus.com" className="hover:text-ink transition-colors break-all">support@gripzus.com</a></li>
              <li><a href="tel:+919712891700" className="hover:text-ink transition-colors">+91 97128 91700</a></li>
              <li className="text-ink-muted leading-relaxed">Royal Plaza, Panchasar Road,<br />Morbi 363641, Gujarat, IN</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Big quiet wordmark */}
      <div className="wrap pb-6 overflow-hidden">
        <h2 className="h-mark leading-[0.9] text-ink" style={{ fontSize: 'clamp(3.5rem, 16vw, 15rem)' }}>GRIPZUS</h2>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-line">
        <div className="wrap py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-ink-muted">
          <p className="tracking-wide">© {year} Gripzus</p>
          <div className="flex items-center gap-5">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="uppercase tracking-[0.12em] hover:text-ink transition-colors">
                {s.label}
              </a>
            ))}
          </div>
          <p className="tracking-wide">
            By{' '}
            <a href="https://finvera.solutions" target="_blank" rel="noopener noreferrer" className="text-ink-soft hover:text-ink">Finvera.solutions</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
