'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';

/* Landing from the custom-checkout provider's redirect.
   success: the bag that was sent to checkout is emptied. No browser Purchase
            fires here: the backend sends the Purchase server-side (keyed on our
            own order number) once the checkout provider confirms the order.
   retry:   offers to reopen the saved bag. */
export default function CheckoutReturn({ mode, orderId }) {
  const { cart, clearCart, setCartOpen } = useStore();
  const done = useRef(false);

  useEffect(() => {
    if (mode !== 'success' || done.current || !orderId) return undefined;
    // Wait a tick for the saved bag to hydrate from localStorage.
    const t = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      const items = cart || [];
      if (items.length) clearCart(true);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, orderId, cart.length]);

  if (mode === 'retry') {
    return (
      <div className="m-oc__cta">
        <button type="button" className="m-btn m-btn--fill" onClick={() => setCartOpen(true)}>Open my bag</button>
        <Link className="m-btn" href="/contact">Need help?</Link>
      </div>
    );
  }
  return null;
}
