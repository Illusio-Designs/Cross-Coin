import Link from 'next/link';
import { toastSubscribed, toastValidationError } from '../../utils/toast';

/* Gripzus footer — cinematic editorial, refined palette.
   Dark ink ground · newsletter call-out · Care/House/Contact columns ·
   massive split GRIPZUS wordmark · slim bottom bar. */

const CARE_LINKS = [
  { label: 'Privacy Policy',        href: '/policies/privacy-policy' },
  { label: 'Terms & Conditions',    href: '/policies/terms-and-conditions' },
  { label: 'Shipping Policy',       href: '/policies/shipping-policy' },
  { label: 'Cancellation & Refund', href: '/policies/cancellation-and-refund' },
];

const HOUSE_LINKS = [
  { label: 'Our Story',   href: '/about' },
  { label: 'The Thread',  href: '/journal' },
  { label: 'Track Order', href: '/track-order' },
  { label: 'Contact',     href: '/contact' },
];

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/gripzus' },
  { label: 'Facebook',  href: 'https://facebook.com/gripzus'  },
  { label: 'WhatsApp',  href: 'https://wa.me/919712891700'    },
];

function MailIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3 7l9 6 9-6" /></svg>; }
function PhoneIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>; }
function PinIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>; }

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-paper">
      {/* Newsletter + columns */}
      <div className="max-w-site mx-auto px-6 md:px-10 lg:px-14 pt-20 md:pt-28 pb-14 md:pb-20 border-b border-paper/10">
        <div className="grid grid-cols-12 gap-10 md:gap-14">

          {/* Newsletter */}
          <div className="col-span-12 md:col-span-6">
            <p className="eyebrow text-paper/50 mb-5">The Inner Sole</p>
            <h3 className="h-display text-paper leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
              Stay <span className="h-italic">in step.</span>
            </h3>
            <p className="text-paper/60 text-base leading-relaxed max-w-[21rem] mt-5 mb-7">
              Field notes, early drops, and a 10% welcome from us. No spam — twice a month, on Fridays.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const email = e.target.email.value.trim();
                if (!email) {
                  toastValidationError('Please enter your email address.');
                  return;
                }
                toastSubscribed();
                e.target.reset();
              }}
              className="flex items-center border border-paper/20 max-w-[21rem] rounded-full overflow-hidden"
            >
              <input
                type="email"
                name="email"
                placeholder="Your email address"
                className="flex-1 bg-transparent text-paper placeholder:text-paper/40 text-sm px-5 py-3.5 outline-none"
              />
              <button type="submit" className="bg-paper text-ink m-1 px-6 py-3 rounded-full text-[11px] tracking-[0.16em] uppercase font-medium hover:bg-paper/80 transition-colors">
                Subscribe
              </button>
            </form>
          </div>

          {/* Columns */}
          <div className="col-span-12 md:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-8 md:pl-10 md:border-l md:border-paper/10">
            <div>
              <p className="eyebrow text-paper/40 mb-5">Care</p>
              <ul className="space-y-3">
                {CARE_LINKS.map((l) => (
                  <li key={l.label}><Link href={l.href} className="text-sm text-paper/70 hover:text-paper transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow text-paper/40 mb-5">House</p>
              <ul className="space-y-3">
                {HOUSE_LINKS.map((l) => (
                  <li key={l.label}><Link href={l.href} className="text-sm text-paper/70 hover:text-paper transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow text-paper/40 mb-5">Contact</p>
              <ul className="space-y-3.5">
                <li>
                  <a href="mailto:support@gripzus.com" className="flex items-start gap-2.5 text-sm text-paper/70 hover:text-paper transition-colors">
                    <span className="mt-0.5 shrink-0 text-paper/40"><MailIcon /></span><span className="break-all">support@gripzus.com</span>
                  </a>
                </li>
                <li>
                  <a href="tel:+919712891700" className="flex items-center gap-2.5 text-sm text-paper/70 hover:text-paper transition-colors">
                    <span className="shrink-0 text-paper/40"><PhoneIcon /></span><span>+91 97128 91700</span>
                  </a>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-paper/55">
                  <span className="mt-0.5 shrink-0 text-paper/40"><PinIcon /></span><span>Ahmedabad,<br />Gujarat, India</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Massive split wordmark */}
      <div className="max-w-site mx-auto px-6 md:px-10 lg:px-14 py-12 md:py-16">
        <h2
          className="h-display text-paper text-center leading-[0.85]"
          style={{ fontSize: 'clamp(4rem, 13vw, 12rem)' }}
        >
          GRIP<span style={{ WebkitTextStroke: '1px rgba(255,255,255,0.5)', color: 'transparent' }}>ZUS</span>
        </h2>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-paper/10">
        <div className="max-w-site mx-auto px-6 md:px-10 lg:px-14 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-paper/45">
          <p className="tracking-wider">© {year} Gripzus. All rights reserved.</p>
          <div className="flex items-center gap-5">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-paper transition-colors tracking-wider uppercase">
                {s.label}
              </a>
            ))}
          </div>
          <p className="tracking-wider">
            Made by{' '}
            <a href="https://illusiodesigns.agency/" target="_blank" rel="noopener noreferrer" className="text-paper hover:underline underline-offset-4">
              Illusio Designs
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
