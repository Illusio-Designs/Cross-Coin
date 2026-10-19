'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { fbPurchase } from '@/utils/pixel';

/* Landing from the custom-checkout provider's redirect.
   success: the bag that was sent to checkout is still saved here, so it gives
            the Purchase its value + contents; then the bag is emptied. The
            Purchase is keyed on the platform order id, and utils/pixel dedupes
            repeat renders / refreshes per order.
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
      fbPurchase(orderId, {
        content_ids: items.map((i) => String(i.productId ?? i.id)),
        content_type: 'product',
        contents: items.map((i) => ({ id: String(i.productId ?? i.id), quantity: i.quantity || 1 })),
        num_items: items.reduce((s, i) => s + (i.quantity || 1), 0),
        value: items.reduce((s, i) => s + Number(i.price || 0) * (i.quantity || 1), 0),
        currency: 'INR',
        order_id: orderId,
      });
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
