'use client';
import Link from 'next/link';
import { Trash2, Plus, Minus, ArrowUpRight, ShoppingBag } from 'lucide-react';
import { useStore } from '@/lib/store';
import PageHeader from '@/components/layout/PageHeader';

export default function CartPage() {
  const { cart, cartTotal, removeFromCart, updateQuantity } = useStore();

  if (cart.length === 0) return (
    <div className="bg-[var(--bg)] min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-24">
      <ShoppingBag size={64} className="text-[var(--ink-muted)]" />
      <h1 className="font-display text-[var(--ink)] uppercase text-4xl tracking-tight">Your bag is empty</h1>
      <p className="text-[var(--ink-soft)] text-base font-body text-center max-w-sm">
        Discover the fragrances that will make every entrance unforgettable.
      </p>
      <Link href="/shop" className="pill-cta">
        Explore the Shop <ArrowUpRight size={14} strokeWidth={1.6} />
      </Link>
    </div>
  );

  const shipping = cartTotal >= 2500 ? 0 : 150;
  const total = cartTotal + shipping;
  const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Review"
        title="YOUR"
        accent="BAG"
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item, i) => (
              <div key={`${item.id}-${item.size}-${i}`}
                className="bg-white border border-[var(--border)] rounded-2xl p-5 flex gap-5">
                <Link href={`/product/${item.slug}`}>
                  <img src={item.image} alt={item.name} className="w-24 h-32 object-cover rounded-xl bg-[var(--surface-2)]" />
                </Link>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/product/${item.slug}`}>
                        <h3 className="font-serif italic text-[var(--ink)] text-xl">{item.name}</h3>
                      </Link>
                      {item.size && <p className="text-[var(--ink-muted)] text-xs font-body mt-1">Size: {item.size}</p>}
                      {item.color && <p className="text-[var(--ink-muted)] text-xs font-body">Color: {item.color}</p>}
                    </div>
                    <button onClick={() => removeFromCart(item.id, item.size)} className="text-[var(--ink-muted)] hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-[var(--border)] rounded-full">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                        className="px-3 py-2 text-[var(--ink-soft)] hover:text-[var(--gold-deep)]">
                        <Minus size={12} />
                      </button>
                      <span className="px-5 text-[var(--ink)] text-sm font-body">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                        className="px-3 py-2 text-[var(--ink-soft)] hover:text-[var(--gold-deep)]">
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="font-serif italic text-[var(--ink)] text-xl">{fmt(item.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-[var(--border)] rounded-2xl p-7 sticky top-28">
              <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">Summary</p>
              <h2 className="font-display text-[var(--ink)] text-2xl uppercase tracking-tight mb-6">Order Total</h2>

              <div className="flex gap-2 mb-6">
                <input type="text" placeholder="Promo code" className="flex-1 input-gold px-4 py-3 text-sm font-body rounded-full" />
                <button className="bg-[var(--ink)] text-white px-5 py-3 text-[10px] tracking-[0.25em] uppercase font-body rounded-full hover:bg-[var(--gold-deep)] transition-colors">Apply</button>
              </div>

              <div className="space-y-3 text-sm font-body">
                <div className="flex justify-between text-[var(--ink-soft)]">
                  <span>Subtotal</span>
                  <span>{fmt(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-[var(--ink-soft)]">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-[var(--gold-deep)]' : ''}>{shipping === 0 ? 'Free' : fmt(shipping)}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-[var(--gold-deep)] text-xs">Add {fmt(2500 - cartTotal)} more for free shipping</p>
                )}
                <p className="text-[var(--ink-muted)] text-xs">Inclusive of 18% GST · Pay via UPI / Card / NetBanking</p>
                <div className="h-px bg-[var(--border)] my-2" />
                <div className="flex justify-between items-baseline">
                  <span className="font-display text-[var(--ink)] text-xl uppercase">Total</span>
                  <span className="font-serif italic text-[var(--ink)] text-2xl">{fmt(total)}</span>
                </div>
              </div>

              <Link href="/checkout" className="pill-cta w-full justify-center !py-4 mt-6">
                Checkout <ArrowUpRight size={14} strokeWidth={1.6} />
              </Link>
              <Link href="/shop" className="block text-center text-[var(--ink-muted)] text-[10px] tracking-[0.3em] uppercase font-body mt-4 hover:text-[var(--gold-deep)] transition-colors">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
