'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import Icon from '@/components/Icon';

const FREE_SHIP_THRESHOLD = 50;

export default function CartDrawer() {
  const { items, subtotal, count, setQty, remove, open, closeCart } = useCart();
  const router = useRouter();

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeCart]);

  const remaining = Math.max(0, FREE_SHIP_THRESHOLD - subtotal);
  const pct = Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100);

  const goCheckout = () => { closeCart(); router.push('/cart'); };

  return (
    <>
      <div className={`cd-backdrop${open ? ' show' : ''}`} onClick={closeCart} />
      <aside className={`cd-drawer${open ? ' show' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping cart" aria-hidden={!open}>

        {/* Header */}
        <div className="cd-header">
          <div className="cd-header-left">
            <span className="cd-header-icon"><Icon name="ShoppingBag" size={18} /></span>
            <div>
              <span className="cd-header-title">Your cart</span>
              <span className="cd-header-count">{count} item{count !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button className="cd-close" onClick={closeCart} aria-label="Close cart"><Icon name="X" size={20} /></button>
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <div className="cd-empty">
            <span className="cd-empty-ic"><Icon name="ShoppingBag" size={34} /></span>
            <b>Your cart is empty</b>
            <p>Add a few pairs and they’ll show up here.</p>
            <button className="btn btn-primary" onClick={closeCart}>Continue shopping</button>
          </div>
        ) : (
          <>
            {/* Free-shipping progress nudge */}
            <div className="cd-ship">
              {remaining > 0 ? (
                <span><Icon name="Truck" size={15} /> You’re <b>${remaining.toFixed(2)}</b> away from free shipping</span>
              ) : (
                <span className="cd-ship-done"><Icon name="ShieldCheck" size={15} /> You’ve unlocked free shipping!</span>
              )}
              <div className="cd-ship-track"><span className="cd-ship-fill" style={{ width: `${pct}%` }} /></div>
            </div>

            {/* Items */}
            <div className="cd-body">
              {items.map((i) => (
                <div className="cd-item" key={i.key}>
                  <Link href={`/product/${i.slug}`} className="cd-thumb" onClick={closeCart} aria-hidden>
                    {i.image ? <img src={i.image} alt="" /> : <Icon name="Footprints" size={26} />}
                  </Link>
                  <div className="cd-item-main">
                    <div className="cd-item-top">
                      <Link href={`/product/${i.slug}`} className="cd-item-name" onClick={closeCart}>{i.name}</Link>
                      <button className="cd-remove" onClick={() => remove(i.key)} aria-label={`Remove ${i.name}`}><Icon name="X" size={15} /></button>
                    </div>
                    <span className="cd-item-size">Size {i.size}</span>
                    <div className="cd-item-bot">
                      <div className="cd-qty">
                        <button onClick={() => setQty(i.key, i.qty - 1)} aria-label="Decrease quantity">−</button>
                        <span>{i.qty}</span>
                        <button onClick={() => setQty(i.key, i.qty + 1)} aria-label="Increase quantity">+</button>
                      </div>
                      <span className="cd-item-price">${(i.price * i.qty).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="cd-foot">
              <div className="cd-trust">
                <span><Icon name="ShieldCheck" size={14} /> Secure checkout</span>
                <span><Icon name="RefreshCw" size={14} /> 14-day returns</span>
              </div>
              <div className="cd-subtotal">
                <span>Subtotal</span>
                <b>${subtotal.toFixed(2)}</b>
              </div>
              <button className="cd-checkout" onClick={goCheckout}>Checkout <Icon name="ArrowRight" size={16} /></button>
              <button className="cd-viewcart" onClick={goCheckout}>View full cart</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
