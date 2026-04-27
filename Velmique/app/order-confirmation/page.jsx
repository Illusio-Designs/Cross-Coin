import Link from 'next/link';
import { CheckCircle, ArrowUpRight } from 'lucide-react';

export default function OrderConfirmation() {
  return (
    <div className="bg-[var(--bg)] min-h-screen flex items-center justify-center px-6 py-20">
      <div className="text-center max-w-2xl">
        <div className="w-24 h-24 rounded-full bg-[var(--gold)]/15 border border-[var(--gold)]/40 flex items-center justify-center mx-auto mb-10">
          <CheckCircle size={42} className="text-[var(--gold-deep)]" />
        </div>
        <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">Order Placed</p>
        <h1 className="font-display text-[var(--ink)] uppercase leading-[0.92] tracking-tight mb-6"
          style={{ fontSize: 'clamp(2.6rem, 7vw, 5.4rem)' }}>
          THANK <em className="not-italic gold-text">YOU</em>
        </h1>
        <p className="text-[var(--ink-soft)] font-body text-base leading-relaxed mb-2 max-w-md mx-auto">
          Your order <span className="font-serif italic text-[var(--ink)]">#VLQ-{Math.floor(Math.random() * 90000) + 10000}</span> has been placed and is being prepared with care in our Grasse atelier.
        </p>
        <p className="text-[var(--ink-muted)] font-body text-sm mb-12">A confirmation email is on its way.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/account/orders" className="pill-cta">
            Track Order <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
          <Link href="/shop" className="pill-cta pill-cta-light">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
