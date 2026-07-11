'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import Icon from '@/components/Icon';

export default function CartPage() {
  const { items, setQty, remove, subtotal, count, ready } = useCart();
  const shipping = subtotal >= 50 || subtotal === 0 ? 0 : 5;
  const total = subtotal + shipping;

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <div className="page-hero"><span className="eyebrow">Cart</span><h1>Your bag</h1></div>

      {ready && items.length === 0 ? (
        <div className="cart-empty">
          <Icon name="ShoppingBag" size={40} color="#c3ccd2" />
          <p>Your bag is empty.</p>
          <Link href="/catalog" className="btn btn-primary">Shop the catalog</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((it) => (
              <div className="cart-item" key={it.key}>
                <Link href={`/product/${it.slug}`} className="cart-thumb">
                  {it.image ? <img src={it.image} alt={it.name} /> : <Icon name="Footprints" size={28} color="#c3ccd2" />}
                </Link>
                <div className="cart-item-info">
                  <Link href={`/product/${it.slug}`}><b>{it.name}</b></Link>
                  <span className="muted">Size {it.size}</span>
                  <div className="price">${it.price.toFixed(2)}</div>
                </div>
                <div className="qty">
                  <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="Decrease">−</button>
                  <span>{it.qty}</span>
                  <button onClick={() => setQty(it.key, it.qty + 1)} aria-label="Increase">+</button>
                </div>
                <div className="cart-line-total">${(it.price * it.qty).toFixed(2)}</div>
                <button className="cart-remove" onClick={() => remove(it.key)} aria-label="Remove">
                  <Icon name="Minus" size={16} />
                </button>
              </div>
            ))}
          </div>

          <aside className="cart-summary">
            <h3>Order summary</h3>
            <div className="row"><span>Subtotal ({count})</span><b>${subtotal.toFixed(2)}</b></div>
            <div className="row"><span>Shipping</span><b>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</b></div>
            <div className="row total"><span>Total</span><b>${total.toFixed(2)}</b></div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>Checkout</button>
            <Link href="/catalog" className="link-more" style={{ justifyContent: 'center', marginTop: 14 }}>
              <Icon name="ArrowRight" size={14} /> Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
