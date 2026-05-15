import Link from 'next/link';
import { useCart } from '../../context/CartContext';

/* Gripzus cart drawer — refined minimal. Slides from the right.
   Mounted once globally in _app.js. */

export default function CartDrawer() {
  const { items, count, subtotal, open, closeCart, removeItem, updateQty, lineKey } = useCart();

  const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 49;
  const total = subtotal + shipping;
  const freeGap = Math.max(0, 999 - subtotal);
  const progress = Math.min(100, (subtotal / 999) * 100);

  return (
    <>
      <div
        onClick={closeCart}
        aria-hidden
        className={`fixed inset-0 z-[60] bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-[61] w-[92%] max-w-[420px] bg-paper flex flex-col shadow-card transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping bag"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-display text-xl text-ink">Your Bag</h2>
            <span className="eyebrow">{count} item{count === 1 ? '' : 's'}</span>
          </div>
          <button onClick={closeCart} aria-label="Close" className="w-9 h-9 flex items-center justify-center text-ink hover:bg-paper-warm rounded-full transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Free shipping progress */}
        {items.length > 0 && (
          <div className="px-6 py-3.5 bg-paper-warm border-b border-line">
            <p className="text-xs text-ink-soft mb-2">
              {freeGap > 0
                ? <>Add <span className="font-semibold text-ink">₹{freeGap.toLocaleString('en-IN')}</span> for free shipping</>
                : <span className="font-semibold text-ink">You&apos;ve unlocked free shipping ✓</span>}
            </p>
            <div className="h-1 rounded-full bg-line overflow-hidden">
              <span className="block h-full bg-ink transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-ink-muted mb-5"><path d="M6 7h12l-1.5 11a2 2 0 01-2 1.8h-5a2 2 0 01-2-1.8L6 7z" /><path d="M9 7V5a3 3 0 016 0v2" strokeLinecap="round" /></svg>
            <p className="font-display text-2xl text-ink mb-1.5">Your bag is empty</p>
            <p className="prose-body text-sm mb-7">Add a pair to get started.</p>
            <Link href="/products" onClick={closeCart} className="btn">Shop the catalogue</Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 divide-y divide-line">
              {items.map((it) => {
                const key = lineKey(it);
                const lineTotal = (it.salePrice ?? it.price) * it.qty;
                return (
                  <div key={key} className="flex gap-4 py-5">
                    <Link href={`/products/${it.slug || it.id}`} onClick={closeCart} className="relative w-[78px] h-[94px] shrink-0 bg-paper-warm overflow-hidden rounded">
                      <img src={it.image} alt={it.name} className="absolute inset-0 w-full h-full object-cover" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/products/${it.slug || it.id}`} onClick={closeCart} className="font-display text-base text-ink leading-snug hover:underline underline-offset-2 line-clamp-2">
                          {it.name}
                        </Link>
                        <button onClick={() => removeItem(key)} aria-label="Remove" className="text-ink-muted hover:text-clay transition-colors shrink-0">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                      {(it.size || it.color) && (
                        <p className="text-xs text-ink-muted mt-1">{[it.color, it.size && `Size ${it.size}`].filter(Boolean).join(' · ')}</p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-line rounded-full">
                          <button onClick={() => updateQty(key, it.qty - 1)} className="w-7 h-7 flex items-center justify-center hover:text-clay">−</button>
                          <span className="w-7 text-center text-xs">{it.qty}</span>
                          <button onClick={() => updateQty(key, it.qty + 1)} className="w-7 h-7 flex items-center justify-center hover:text-clay">+</button>
                        </div>
                        <p className="font-display text-base text-ink">₹{lineTotal.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-line px-6 py-5">
              <dl className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd className="text-ink">₹{subtotal.toLocaleString('en-IN')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-muted">Shipping</dt><dd className="text-ink">{shipping === 0 ? 'Free' : `₹${shipping}`}</dd></div>
              </dl>
              <div className="flex justify-between items-baseline border-t border-line pt-4 mb-5">
                <span className="eyebrow">Total</span>
                <span className="font-display text-2xl text-ink">₹{total.toLocaleString('en-IN')}</span>
              </div>
              <button className="btn w-full mb-2.5">Checkout</button>
              <button onClick={closeCart} className="block w-full text-center eyebrow hover:text-ink py-1">Continue shopping</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
