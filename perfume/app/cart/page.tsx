'use client';
import Link from 'next/link';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function CartPage() {
  const { cart, cartTotal, removeFromCart, updateQuantity } = useStore();

  if (cart.length === 0) return (
    <div className="pt-32 min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <ShoppingBag size={64} className="text-cream/10" />
      <h1 className="font-serif text-3xl text-cream/50">Your bag is empty</h1>
      <p className="text-cream/30 text-sm font-body text-center">Discover pieces that will make you extraordinary.</p>
      <Link href="/shop" className="btn-gold px-10 py-4 text-xs tracking-[0.2em] uppercase font-body rounded-sm">
        Explore the Shop
      </Link>
    </div>
  );

  const shipping = cartTotal >= 150 ? 0 : 15;
  const total = cartTotal + shipping;

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10">
          <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-2">Review</p>
          <h1 className="font-serif text-4xl text-cream">Your Bag</h1>
          <div className="gold-divider w-16 mt-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Items */}
          <div className="lg:col-span-2 space-y-6">
            {cart.map((item, i) => (
              <div key={`${item.id}-${item.size}-${i}`} className="flex gap-5 pb-6 border-b border-[#C9A84C]/10">
                <Link href={`/product/${item.slug}`}>
                  <img src={item.image} alt={item.name} className="w-24 h-32 object-cover rounded-sm bg-[#1a1a1a]" />
                </Link>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/product/${item.slug}`}>
                        <h3 className="font-serif text-lg text-cream hover:text-[#C9A84C] transition-colors">{item.name}</h3>
                      </Link>
                      {item.size && <p className="text-cream/40 text-xs font-body mt-0.5">Size: {item.size}</p>}
                      {item.color && <p className="text-cream/40 text-xs font-body">Color: {item.color}</p>}
                    </div>
                    <button onClick={() => removeFromCart(item.id, item.size)} className="text-cream/20 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-0 border border-[#C9A84C]/20 rounded-sm">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)} className="px-3 py-2 text-cream/60 hover:text-[#C9A84C] border-r border-[#C9A84C]/20">
                        <Minus size={12} />
                      </button>
                      <span className="px-5 text-cream text-sm font-body">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)} className="px-3 py-2 text-cream/60 hover:text-[#C9A84C] border-l border-[#C9A84C]/20">
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-[#C9A84C] font-body text-lg">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-[#1a1a1a] border border-[#C9A84C]/15 rounded-sm p-6 sticky top-28">
              <h2 className="font-serif text-xl text-cream mb-6">Order Summary</h2>

              <div className="flex gap-2 mb-6">
                <input type="text" placeholder="Promo code" className="flex-1 input-gold px-3 py-2.5 text-xs font-body rounded-sm" />
                <button className="btn-outline-gold px-4 py-2.5 text-xs tracking-wider uppercase font-body rounded-sm">Apply</button>
              </div>

              <div className="space-y-3 text-sm font-body">
                <div className="flex justify-between text-cream/60">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-cream/60">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-[#C9A84C]' : ''}>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-[#C9A84C]/60 text-xs">Add ${(150 - cartTotal).toFixed(2)} more for free shipping</p>
                )}
                <div className="gold-divider" />
                <div className="flex justify-between">
                  <span className="font-serif text-lg text-cream">Total</span>
                  <span className="gold-text font-serif text-lg">${total.toFixed(2)}</span>
                </div>
              </div>

              <Link href="/checkout"
                className="btn-gold w-full mt-6 py-4 text-xs tracking-[0.2em] uppercase font-body flex items-center justify-center gap-2 rounded-sm">
                Checkout <ArrowRight size={14} />
              </Link>
              <Link href="/shop" className="block text-center text-cream/30 text-xs tracking-wider uppercase font-body mt-4 hover:text-[#C9A84C] transition-colors">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
