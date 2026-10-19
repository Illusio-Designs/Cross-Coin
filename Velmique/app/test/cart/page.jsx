'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function MaisonCart() {
  const { cart, cartTotal, updateQuantity, removeFromCart } = useStore();

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">Your selection</span>
        <h1>The Bag.</h1>
      </section>

      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        {cart.length === 0 ? (
          <div className="m-empty">
            <h3>Your bag is empty</h3>
            <p style={{ marginBottom: 20 }}>Discover a scent worth remembering.</p>
            <Link className="m-btn m-btn--fill" href="/test/shop" style={{ justifyContent: 'center' }}>Explore the collection</Link>
          </div>
        ) : (
          <div className="m-cartgrid">
            <div className="m-crows">
              {cart.map((it) => (
                <div className="m-crow" key={`${it.id}-${it.size}`}>
                  {it.image ? <img className="m-crow__img" src={it.image} alt={it.name} style={{ gridArea: 'img' }} /> : <span className="m-crow__img" style={{ gridArea: 'img' }} />}
                  <div style={{ gridArea: 'body' }}>
                    <div className="m-crow__n">{it.name}</div>
                    {it.size ? <div className="m-crow__m">{it.size}</div> : null}
                    <div className="m-line__q" style={{ marginTop: 10 }}>
                      <button aria-label="Decrease" onClick={() => updateQuantity(it.id, it.quantity - 1, it.size)}>−</button>
                      <span>{it.quantity}</span>
                      <button aria-label="Increase" onClick={() => updateQuantity(it.id, it.quantity + 1, it.size)}>+</button>
                    </div>
                    <button className="m-line__rm" onClick={() => removeFromCart(it.id, it.size)}>Remove</button>
                  </div>
                  <div className="m-crow__n" style={{ gridArea: 'price', textAlign: 'right' }}>{inr(it.price * it.quantity)}</div>
                </div>
              ))}
            </div>

            <aside className="m-summary">
              <h3>Order Summary</h3>
              <div className="m-sumrow"><span>Subtotal</span><span>{inr(cartTotal)}</span></div>
              <div className="m-sumrow"><span>Shipping</span><span>Free</span></div>
              <div className="m-sumrow tot"><span>Total</span><b>{inr(cartTotal)}</b></div>
              <Link className="m-btn m-btn--fill" href="/checkout" style={{ justifyContent: 'center', width: '100%', marginTop: 16 }}>Proceed to checkout</Link>
              <Link className="m-btn m-btn--ghost" href="/test/shop" style={{ justifyContent: 'center', width: '100%', marginTop: 10 }}>Continue shopping</Link>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
