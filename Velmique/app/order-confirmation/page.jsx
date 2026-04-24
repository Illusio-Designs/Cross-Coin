import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function OrderConfirmation() {
  return (
    <div className="pt-32 min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 rounded-full bg-[#b8624f]/10 border border-[#b8624f]/30 flex items-center justify-center mx-auto mb-8">
          <CheckCircle size={36} className="text-[#d4927f]" />
        </div>
        <p className="text-[#d4927f] text-xs tracking-[0.4em] uppercase font-body mb-3">Order Placed</p>
        <h1 className="font-serif text-4xl text-[#f3ede0] mb-4">Thank You</h1>
        <div className="gold-divider w-16 mx-auto mb-6" />
        <p className="text-[#f3ede0]/50 font-body text-sm leading-relaxed mb-2">
          Your order <span className="text-[#d4927f]">#VLQ-{Math.floor(Math.random() * 90000) + 10000}</span> has been placed and is being prepared with care.
        </p>
        <p className="text-[#f3ede0]/40 font-body text-xs mb-10">A confirmation email will be sent to your address.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/account/orders" className="btn-gold px-8 py-4 text-xs tracking-[0.2em] uppercase font-body flex items-center justify-center gap-2 rounded-sm">
            Track Order <ArrowRight size={14} />
          </Link>
          <Link href="/shop" className="btn-outline-gold px-8 py-4 text-xs tracking-[0.2em] uppercase font-body rounded-sm">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
