import Link from 'next/link';
import Image from 'next/image';
import { toastSubscribed, toastValidationError } from '../../utils/toast';

/* Gripzus footer — premium dark panel with a rounded top. Icon socials,
   icon contact rows, an animated newsletter. No oversized wordmark. */

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

function IgIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>; }
function FbIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H7v3h2v9h3v-9h2.5l.5-3H12V6.5a1 1 0 0 1 1-1h2z" /></svg>; }
function WaIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-11.7 7.7L3 21l1.9-6.1A8.5 8.5 0 1 1 21 11.5z" /><path d="M8.5 8.8c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.5.2.5.6 1.6.6 1.7.1.1.1.3 0 .4l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.2 1.7 1.7.9.6 1.2.5 1.4.4.2-.1.5-.6.7-.8.1-.2.3-.2.5-.1.2.1 1.3.6 1.5.8.2.1.3.1.4.2 0 .2 0 .8-.3 1.2-.3.5-1.2.9-1.7.9-.5 0-1.9-.2-3.9-1.7-2-1.6-2.6-3.4-2.7-3.6-.1-.2-.6-1.2-.6-2 0-.8.4-1.1.6-1.3z" fill="currentColor" stroke="none" /></svg>; }
function MailIcon(){ return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 6 8-6" /></svg>; }
function PhoneIcon(){ return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>; }
function PinIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>; }

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/gripzus', Icon: IgIcon },
  { label: 'Facebook',  href: 'https://facebook.com/gripzus',  Icon: FbIcon },
  { label: 'WhatsApp',  href: 'https://wa.me/919712891700',    Icon: WaIcon },
];

function Column({ title, links }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.16em] uppercase text-paper/45 mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="group inline-flex items-center gap-2 text-[13px] text-paper/70 hover:text-paper transition-colors">
              <span className="w-0 h-px bg-paper transition-all duration-300 group-hover:w-3" />
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
  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="bg-ink text-paper rounded-t-[32px] md:rounded-t-[44px] mt-8">
      <div className="wrap pt-14 md:pt-20 pb-8">

        {/* Top — brand + newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-12 border-b border-paper/10">
          <div>
            <Image src="/assets/Gripzus.JPG.jpeg" alt="Gripzus" width={150} height={40} className="h-6 w-auto object-contain" style={{ filter: 'invert(1) brightness(2)' }} />
            <p className="text-paper/55 text-[13px] leading-relaxed max-w-xs mt-5">
              Engineered grip socks, made for movement. Considered pairs, built to last.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-2.5 mt-6">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-10 h-10 rounded-full border border-paper/20 flex items-center justify-center text-paper/75 hover:text-ink hover:bg-paper hover:border-paper transition-all hover:-translate-y-0.5">
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:justify-self-end w-full lg:max-w-sm">
            <p className="text-[10px] tracking-[0.16em] uppercase text-paper/45 mb-3">Newsletter</p>
            <p className="h-display text-xl md:text-2xl leading-snug mb-5">New drops & stories, twice a month.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const email = e.target.email.value.trim();
                if (!email) { toastValidationError('Please enter your email address.'); return; }
                toastSubscribed();
                e.target.reset();
              }}
              className="flex items-center gap-2 rounded-full border border-paper/25 pl-5 pr-1.5 py-1.5 focus-within:border-paper/60 transition-colors"
            >
              <input type="email" name="email" placeholder="Email address"
                className="flex-1 bg-transparent text-paper placeholder:text-paper/40 text-sm py-2 outline-none" />
              <button type="submit" aria-label="Subscribe" className="w-10 h-10 shrink-0 rounded-full bg-paper text-ink flex items-center justify-center hover:opacity-80 transition-opacity">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" /></svg>
              </button>
            </form>
          </div>
        </div>

        {/* Columns + contact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 py-12">
          <Column title="Care" links={CARE_LINKS} />
          <Column title="House" links={HOUSE_LINKS} />
          <div className="col-span-2">
            <p className="text-[10px] tracking-[0.16em] uppercase text-paper/45 mb-4">Contact</p>
            <ul className="space-y-3.5 text-[13px]">
              <li>
                <a href="mailto:support@gripzus.com" className="group inline-flex items-center gap-3 text-paper/75 hover:text-paper transition-colors">
                  <span className="w-9 h-9 rounded-full border border-paper/15 flex items-center justify-center text-paper/60 group-hover:border-paper/40 transition-colors"><MailIcon /></span>
                  <span className="break-all">support@gripzus.com</span>
                </a>
              </li>
              <li>
                <a href="tel:+919712891700" className="group inline-flex items-center gap-3 text-paper/75 hover:text-paper transition-colors">
                  <span className="w-9 h-9 rounded-full border border-paper/15 flex items-center justify-center text-paper/60 group-hover:border-paper/40 transition-colors"><PhoneIcon /></span>
                  <span>+91 97128 91700</span>
                </a>
              </li>
              <li className="inline-flex items-center gap-3 text-paper/60">
                <span className="w-9 h-9 rounded-full border border-paper/15 flex items-center justify-center shrink-0"><PinIcon /></span>
                <span className="leading-relaxed">Royal Plaza, Panchasar Road, Morbi 363641, Gujarat, IN</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-paper/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-paper/45">
          <p className="tracking-wide">© {year} Gripzus. All rights reserved.</p>
          <p className="tracking-wide">By <a href="https://finvera.solutions" target="_blank" rel="noopener noreferrer" className="text-paper/70 hover:text-paper">Finvera.solutions</a></p>
          <button onClick={toTop} className="group inline-flex items-center gap-2 tracking-wide uppercase text-paper/60 hover:text-paper transition-colors">
            Back to top
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-full border border-paper/20 group-hover:border-paper group-hover:-translate-y-0.5 transition-all">↑</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
