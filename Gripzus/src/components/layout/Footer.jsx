import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toastSubscribed, toastValidationError } from '../../utils/toast';

/* Gripzus footer — aesthetic & animated.
   • A tagline marquee up top.
   • Newsletter with an animated underline + arrow.
   • Link columns with a slide-on-hover.
   • A giant GRIPZUS wordmark that reveals letter-by-letter on scroll.
   • Back-to-top. */

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
const TAGLINE = ['ENGINEERED GRIP', 'MADE FOR MOVEMENT', 'FREE SHIPPING OVER ₹999', '30-DAY RETURNS'];

function Column({ title, links }) {
  return (
    <div>
      <p className="eyebrow text-ink-muted mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="group inline-flex items-center gap-2 text-[13px] text-ink-soft hover:text-ink transition-colors">
              <span className="w-0 h-px bg-ink transition-all duration-300 group-hover:w-3" />
              <span className="-ml-2 group-hover:ml-0 transition-all duration-300">{l.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  const markRef = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = markRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const letters = 'GRIPZUS'.split('');

  return (
    <footer className="bg-paper border-t border-ink">
      {/* Tagline marquee */}
      <div className="border-b border-line overflow-hidden">
        <div className="gz-marq flex whitespace-nowrap py-3">
          {[0, 1].map((d) => (
            <div key={d} className="flex items-center" aria-hidden={d === 1}>
              {TAGLINE.concat(TAGLINE).map((t, i) => (
                <span key={`${d}-${i}`} className="flex items-center text-[10px] tracking-[0.2em] uppercase text-ink-soft px-6">
                  {t}<span className="ml-6 w-1 h-1 rounded-full bg-ink-muted" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="wrap pt-14 md:pt-20 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-6 gap-y-12">
          {/* Newsletter */}
          <div className="col-span-2 md:col-span-5">
            <p className="eyebrow text-ink-muted mb-4">Newsletter</p>
            <p className="h-display text-xl md:text-2xl max-w-xs leading-snug mb-6">New drops & stories, twice a month.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const email = e.target.email.value.trim();
                if (!email) { toastValidationError('Please enter your email address.'); return; }
                toastSubscribed();
                e.target.reset();
              }}
              className="group relative flex items-center max-w-sm"
            >
              <input type="email" name="email" placeholder="Email address"
                className="flex-1 bg-transparent text-ink placeholder:text-ink-muted text-sm py-2.5 outline-none" />
              <button type="submit" className="text-[11px] uppercase tracking-[0.14em] py-2.5 pl-4 hover:opacity-55 transition-opacity">Subscribe →</button>
              <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-line" />
              <span className="pointer-events-none absolute bottom-0 left-0 h-px w-0 bg-ink transition-all duration-500 group-focus-within:w-full" />
            </form>
          </div>

          <div className="md:col-span-1 hidden md:block" />
          <div className="md:col-span-2"><Column title="Care" links={CARE_LINKS} /></div>
          <div className="md:col-span-2"><Column title="House" links={HOUSE_LINKS} /></div>
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

      {/* Giant animated wordmark */}
      <div ref={markRef} className="wrap overflow-hidden select-none">
        <h2 className="h-mark leading-[0.82] text-ink flex justify-between" style={{ fontSize: 'clamp(3.2rem, 15.5vw, 15rem)' }} aria-label="Gripzus">
          {letters.map((ch, i) => (
            <span key={i} className="inline-block overflow-hidden" aria-hidden>
              <span
                className="inline-block will-change-transform"
                style={{
                  transform: shown ? 'translateY(0)' : 'translateY(110%)',
                  opacity: shown ? 1 : 0,
                  transition: `transform .7s cubic-bezier(.22,1,.36,1) ${i * 0.06}s, opacity .7s ease ${i * 0.06}s`,
                }}
              >
                {ch}
              </span>
            </span>
          ))}
        </h2>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-line">
        <div className="wrap py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-ink-muted">
          <p className="tracking-wide">© {year} Gripzus</p>
          <div className="flex items-center gap-5">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                className="relative uppercase tracking-[0.12em] text-ink-soft hover:text-ink transition-colors after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-ink hover:after:w-full after:transition-all after:duration-300">
                {s.label}
              </a>
            ))}
          </div>
          <button onClick={toTop} className="group inline-flex items-center gap-2 tracking-wide uppercase text-ink-soft hover:text-ink transition-colors">
            Back to top
            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full border border-line group-hover:border-ink group-hover:-translate-y-0.5 transition-all">↑</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .gz-marq > div { animation: gz-marq 30s linear infinite; min-width: 100%; }
        .gz-marq:hover > div { animation-play-state: paused; }
        @keyframes gz-marq { from { transform: translateX(0); } to { transform: translateX(-100%); } }
      `}</style>
    </footer>
  );
}
