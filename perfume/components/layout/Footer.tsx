import Link from 'next/link';
import { Instagram, Twitter, Facebook, Youtube, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#080808] border-t border-[#C9A84C]/15">
      {/* Newsletter */}
      <div className="border-b border-[#C9A84C]/10">
        <div className="max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-serif text-2xl gold-text mb-1">Join the Inner Circle</h3>
            <p className="text-cream/50 text-sm font-body">Exclusive offers, new arrivals & style notes — delivered to you.</p>
          </div>
          <div className="flex w-full md:w-auto gap-0 max-w-md">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 input-gold px-4 py-3 text-sm font-body rounded-l-sm"
            />
            <button className="btn-gold px-6 py-3 text-xs tracking-[0.2em] uppercase font-body whitespace-nowrap rounded-r-sm">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div>
          <div className="mb-6">
            <span className="font-serif text-3xl gold-shimmer font-bold">Velmique</span>
            <p className="text-cream/40 text-xs mt-3 leading-relaxed font-body">
              Where luxury meets artistry. Crafted for the extraordinary.
            </p>
          </div>
          <div className="flex gap-4 mt-4">
            {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
              <a key={i} href="#" className="text-cream/30 hover:text-[#C9A84C] transition-colors">
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs tracking-[0.2em] uppercase text-[#C9A84C] mb-5 font-body">Shop</h4>
          <ul className="space-y-3">
            {['All Products', 'New Arrivals', 'Collections', 'Lookbook', 'Blog'].map(l => (
              <li key={l}>
                <Link href={l === 'All Products' ? '/shop' : `/${l.toLowerCase().replace(' ', '-')}`}
                  className="text-cream/45 hover:text-cream text-sm font-body transition-colors">{l}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs tracking-[0.2em] uppercase text-[#C9A84C] mb-5 font-body">Account</h4>
          <ul className="space-y-3">
            {[['My Account', '/account'], ['Orders', '/account/orders'], ['Wishlist', '/wishlist'], ['Contact', '/contact']].map(([l, h]) => (
              <li key={l}>
                <Link href={h} className="text-cream/45 hover:text-cream text-sm font-body transition-colors">{l}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs tracking-[0.2em] uppercase text-[#C9A84C] mb-5 font-body">Support</h4>
          <ul className="space-y-3">
            {[['FAQ', '/faq'], ['Shipping & Returns', '/shipping-returns'], ['Privacy Policy', '/privacy-policy'], ['Terms & Conditions', '/terms']].map(([l, h]) => (
              <li key={l}>
                <Link href={h} className="text-cream/45 hover:text-cream text-sm font-body transition-colors">{l}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-2 text-cream/40 text-xs font-body">
            <Mail size={12} />
            <a href="mailto:hello@velmique.com" className="hover:text-[#C9A84C] transition-colors">hello@velmique.com</a>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-[#C9A84C]/10 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-cream/25 text-xs font-body tracking-wider">© 2026 Velmique. All rights reserved.</p>
          <div className="flex items-center gap-2 text-cream/20">
            {['VISA', 'MC', 'AMEX', 'PAYPAL', 'APPLE PAY'].map(p => (
              <span key={p} className="border border-cream/10 px-2 py-0.5 text-[9px] tracking-wider rounded-sm font-body">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
