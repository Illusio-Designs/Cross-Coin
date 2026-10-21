'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { confirmCheckoutReturn } from '@/lib/api/orders';
import { fbPurchase } from '@/utils/pixel';

/* Landing from the custom-checkout provider's redirect.
   success: the bag that was sent to checkout is emptied, and our backend
            confirms the order (sending this browser's ids + cookie choice).
            It answers with our own order number, so the browser Purchase
            (only with marketing consent) and the server one share the event
            id Purchase_<order number> and Meta counts the sale once.
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
      // The provider may need a moment to have the order ready: try 3 times.
      const confirm = (tries) => confirmCheckoutReturn(orderId)
        .then((o) => {
          if (!o?.order_number) return;
          const contents = o.items || [];
          fbPurchase(o.order_number, {
            content_ids: contents.map((i) => i.id),
            content_type: 'product',
            contents,
            num_items: contents.reduce((s, i) => s + (i.quantity || 1), 0),
            value: Number(o.value || 0),
            currency: 'INR',
            order_id: o.order_number,
          });
        })
        .catch(() => { if (tries > 1) setTimeout(() => confirm(tries - 1), 2500); });
      confirm(3);
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
