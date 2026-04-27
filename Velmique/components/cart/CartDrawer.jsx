'use client';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/lib/store';

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, cartTotal, cartCount, removeFromCart, updateQuantity } = useStore();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${cartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-md z-[90] bg-[#F5EFE0] border-l border-[#E0D4B8] transition-transform duration-400 ease-out flex flex-col ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#C9A84C]/15">
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} className="text-[#8B6914]" />
            <span className="font-serif text-lg text-[#1A1612]">Your Bag</span>
            {cartCount > 0 && <span className="bg-[#C9A84C]/20 text-[#8B6914] text-xs px-2 py-0.5 rounded-full font-body">{cartCount}</span>}
          </div>
          <button onClick={() => setCartOpen(false)} className="text-[#1A1612]/50 hover:text-[#8B6914] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <ShoppingBag size={48} className="text-[#1A1612]/10" />
              <p className="font-serif text-xl text-[#1A1612]/40">Your bag is empty</p>
              <p className="text-[#1A1612]/30 text-sm font-body">Discover our luxury collections</p>
              <Link href="/shop" onClick={() => setCartOpen(false)}
                className="btn-gold px-8 py-3 text-xs tracking-[0.2em] uppercase font-body mt-2 inline-block">
                Explore Now
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {cart.map((item, i) => (
                <div key={`${item.id}-${item.size}-${i}`} className="flex gap-4 pb-5 border-b border-[#C9A84C]/10 last:border-0">
                  <Link href={`/product/${item.slug}`} onClick={() => setCartOpen(false)}>
                    <img src={item.image} alt={item.name} className="w-20 h-24 object-cover rounded-sm flex-shrink-0" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.slug}`} onClick={() => setCartOpen(false)}>
                      <h4 className="font-serif text-sm text-[#1A1612] hover:text-[#8B6914] transition-colors truncate">{item.name}</h4>
                    </Link>
                    {item.size && <p className="text-[#1A1612]/40 text-xs mt-0.5 font-body">Size: {item.size}</p>}
                    {item.color && <p className="text-[#1A1612]/40 text-xs font-body">Color: {item.color}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 border border-[#C9A84C]/20 rounded-sm">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                          className="px-2 py-1 text-[#1A1612]/60 hover:text-[#8B6914] transition-colors">
                          <Minus size={12} />
                        </button>
                        <span className="text-[#1A1612] text-sm w-4 text-center font-body">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                          className="px-2 py-1 text-[#1A1612]/60 hover:text-[#8B6914] transition-colors">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-[#8B6914] font-body text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id, item.size)}
                    className="text-[#1A1612]/20 hover:text-red-400 transition-colors self-start mt-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-[#C9A84C]/15 px-6 py-5 space-y-4">
            {/* Promo */}
            <div className="flex gap-2">
              <input type="text" placeholder="Promo code" className="flex-1 input-gold px-3 py-2 text-xs font-body rounded-sm" />
              <button className="btn-outline-gold px-4 py-2 text-xs tracking-wider uppercase font-body rounded-sm">Apply</button>
            </div>
            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-[#1A1612]/50 text-sm font-body">
                <span>Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#1A1612]/50 text-sm font-body">
                <span>Shipping</span>
                <span className="text-[#8B6914]">{cartTotal >= 150 ? 'Free' : '$15.00'}</span>
              </div>
              <div className="gold-divider" />
              <div className="flex justify-between text-[#1A1612] font-serif text-lg">
                <span>Total</span>
                <span className="gold-text">${(cartTotal + (cartTotal >= 150 ? 0 : 15)).toFixed(2)}</span>
              </div>
            </div>
            <Link href="/checkout" onClick={() => setCartOpen(false)}
              className="btn-gold w-full py-4 text-xs tracking-[0.2em] uppercase font-body flex items-center justify-center gap-2 rounded-sm">
              Proceed to Checkout <ArrowRight size={14} />
            </Link>
            <Link href="/cart" onClick={() => setCartOpen(false)}
              className="block text-center text-[#1A1612]/40 text-xs tracking-wider uppercase font-body hover:text-[#8B6914] transition-colors">
              View Full Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
