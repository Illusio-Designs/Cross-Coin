'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { confirmCheckoutReturn } from '@/lib/api/orders';
import { SR_SOURCE_KEY } from '@/lib/api/shiprocketCheckout';
import { fbPurchase, rememberBuyer } from '@/utils/pixel';
import { takePurchaseForThankYou, hasConfirmedPurchase } from '@/lib/thankYou';

const readSession = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const dropSession = (k) => { try { sessionStorage.removeItem(k); } catch { /* blocked */ } };

/* The thank-you page's client side.
   own:     our own checkout placed the order; fires the browser Purchase
            with the details the bag handed over (lib/thankYou.js), once.
   success: landing from Shiprocket Checkout's redirect. A checkout started
            from the bag empties the bag (a single Buy now leaves it alone),
            and our backend confirms the order (sending this browser's ids +
            cookie choice). It answers with our own order number, so the
            browser Purchase (only with marketing consent) and the server one
            share the event id Purchase_<order number> and Meta counts the
            sale once.
   retry:   offers to reopen the saved bag. */
export default function CheckoutReturn({ mode, orderId, orderNumber, children }) {
  const { cartHydrated, clearCart, setCartOpen } = useStore();
  const done = useRef(false);
  const clearPending = useRef(false);
  const [state, setState] = useState({ phase: 'loading' });

  useEffect(() => {
    if (mode !== 'own' || done.current || !orderNumber) return;
    done.current = true;
    const data = takePurchaseForThankYou(orderNumber);
    setState(hasConfirmedPurchase(orderNumber) ? { phase: 'done', orderNumber } : { phase: 'pending' });
    if (data) { try { fbPurchase(orderNumber, data); } catch (_) { /* optional tracking */ } }
  }, [mode, orderNumber]);

  useEffect(() => {
    if (mode !== 'success' || done.current || !orderId) return undefined;
    // Wait a tick for the saved bag to hydrate from localStorage.
    const t = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      const fromBag = readSession(SR_SOURCE_KEY) === 'cart';

      // The provider may need a moment to have the order ready: try 3 times.
      const confirm = (tries) => confirmCheckoutReturn(orderId)
        .then((o) => {
        try {
          if (!o?.order_number) { setState({ phase: 'pending' }); return; }
          clearPending.current = fromBag;
          dropSession(SR_SOURCE_KEY);
          setState({ phase: 'done', orderNumber: o.order_number });
          const contents = o.items || [];
          // The buyer's hashed email / phone (from our server): the browser
          // Purchase then matches as well as the server's, and so do their
          // later visits.
          if (o.am) rememberBuyer(o.am);
          fbPurchase(o.order_number, {
            content_ids: contents.map((i) => i.id),
            content_type: 'product',
            contents,
            num_items: contents.reduce((s, i) => s + (i.quantity || 1), 0),
            value: Number(o.value || 0),
            currency: 'INR',
            order_id: o.order_number,
          });

        } catch (_) { /* A saved order stays confirmed if optional browser effects fail. */ }
      })
        .catch(() => { if (tries > 1) setTimeout(() => confirm(tries - 1), tries === 3 ? 500 : 1500); else setState({ phase: 'pending' }); });
      confirm(3);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, orderId]);

  useEffect(() => {
    if (state.phase !== 'done' || !clearPending.current || !cartHydrated) return;
    clearPending.current = false; clearCart(true);
  }, [state.phase, cartHydrated, clearCart]);

  if (mode === 'retry') {
    return (
      <div className="m-oc__cta">
        <button type="button" className="m-btn m-btn--fill" onClick={() => setCartOpen(true)}>Open my bag</button>
        <Link className="m-btn" href="/contact">Need help?</Link>
      </div>
    );
  }
  if (state.phase !== 'done') return (
    <>
      <h1>{state.phase === 'pending' ? 'Order confirmation pending' : 'Confirming your order…'}</h1>
      <p className="m-oc__lede">{state.phase === 'pending' ? 'We have not confirmed this order in our system yet. Keep your checkout reference and contact support before paying again.' : 'We are verifying your order. This takes a moment.'}</p>
      <Link className="m-btn" href="/contact">Contact support</Link>
    </>
  );
  return <><p className="m-oc__lede">Order <b>#{state.orderNumber}</b></p>{children}</>;
}
