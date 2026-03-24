import Link from 'next/link';
import { Instagram, Twitter, Facebook, Youtube, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/5">
      {/* Newsletter */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-serif text-2xl text-white mb-1">Join the Inner Circle</h3>
            <p className="text-white/40 text-sm font-body">Exclusive offers, new fragrances & scent notes — delivered to you.</p>
          </div>
          <div className="flex w-full md:w-auto gap-0 max-w-md">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 bg-white/5 border border-white/10 focus:border-[#C9A84C] outline-none px-4 py-3 text-sm font-body text-white placeholder:text-white/20 transition-colors"
            />
            <button className="bg-[#C9A84C] hover:bg-white text-black px-6 py-3 text-xs tracking-[0.2em] uppercase font-body font-semibold whitespace-nowrap transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div>
          <div className="mb-6">
            <span className="font-serif text-3xl text-white font-bold">Velmique</span>
            <p className="text-white/30 text-xs mt-3 leading-relaxed font-body">
              Where luxury meets artistry. Crafted from the world's rarest ingredients.
            </p>
          </div>
          <div className="flex gap-4 mt-4">
            {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
              <a key={i} href="#" className="w-8 h-8 border border-white/10 hover:border-[#C9A84C] flex items-center justify-center text-white/30 hover:text-[#C9A84C] transition-all">
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] tracking-[0.25em] uppercase text-[#C9A84C] mb-5 font-body font-semibold">Shop</h4>
          <ul className="space-y-3">
            {[
              ['All Fragrances', '/shop'],
              ['New Arrivals', '/shop?filter=new'],
              ['Collections', '/collections'],
              ['Lookbook', '/lookbook'],
              ['Blog', '/blog'],
            ].map(([l, h]) => (
              <li key={l}>
                <Link href={h} className="text-white/35 hover:text-white text-sm font-body transition-colors">{l}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] tracking-[0.25em] uppercase text-[#C9A84C] mb-5 font-body font-semibold">Account</h4>
          <ul className="space-y-3">
            {[['My Account', '/account'], ['Orders', '/account/orders'], ['Wishlist', '/wishlist'], ['Contact', '/contact']].map(([l, h]) => (
              <li key={l}>
                <Link href={h} className="text-white/35 hover:text-white text-sm font-body transition-colors">{l}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] tracking-[0.25em] uppercase text-[#C9A84C] mb-5 font-body font-semibold">Support</h4>
          <ul className="space-y-3">
            {[['FAQ', '/faq'], ['Shipping & Returns', '/shipping-returns'], ['Privacy Policy', '/privacy-policy'], ['Terms & Conditions', '/terms']].map(([l, h]) => (
              <li key={l}>
                <Link href={h} className="text-white/35 hover:text-white text-sm font-body transition-colors">{l}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-2 text-white/30 text-xs font-body">
            <Mail size={12} />
            <a href="mailto:hello@velmique.com" className="hover:text-[#C9A84C] transition-colors">hello@velmique.com</a>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/5 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs font-body tracking-wider">© 2026 Velmique. All rights reserved.</p>
          <div className="flex items-center gap-2 text-white/15">
            {['VISA', 'MC', 'AMEX', 'PAYPAL', 'APPLE PAY'].map(p => (
              <span key={p} className="border border-white/10 px-2 py-0.5 text-[9px] tracking-wider font-body">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
