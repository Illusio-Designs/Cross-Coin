'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { useCart } from '@/context/CartContext';
import { confirmShiprocketOrder, SR_SOURCE_KEY } from '@/lib/api/shiprocketCheckout';
import { fbPurchase } from '@/utils/pixel';
import { takePurchaseForThankYou } from '@/lib/thankYou';

const readSession = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const dropSession = (k) => { try { sessionStorage.removeItem(k); } catch { /* blocked */ } };

/* The thank-you page. The Purchase fires here, once, with the event id
   Purchase_<order number> — the same id the server's Conversions API event
   uses, so Meta counts the sale once.
   - Our own checkout: the order is already saved; its details come from
     sessionStorage.
   - Shiprocket: on SUCCESS our backend confirms the order with Shiprocket and
     answers with our order number; any other status means the payment didn't
     complete. A checkout started from the cart empties the cart once the
     order is confirmed; a single Buy now leaves the cart alone. */
export default function OrderConfirmationClient({ order, id, oid, ost }) {
  const { clear, openCart } = useCart();
  const [state, setState] = useState(() => {
    if (order) return { phase: 'done', orderNumber: order };
    if (!oid) return { phase: 'none' };
    return ost === 'SUCCESS' ? { phase: 'loading' } : { phase: 'failed', ost };
  });
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    if (order) {
      const data = takePurchaseForThankYou(order);
      if (data) fbPurchase(order, data);
      return;
    }
    if (!oid || ost !== 'SUCCESS') return;

    const fromCart = readSession(SR_SOURCE_KEY) === 'cart';
    // Shiprocket may need a moment to have the order ready: try 3 times.
    const confirm = (tries) => confirmShiprocketOrder(oid)
      .then((o) => {
        setState({ phase: 'done', orderNumber: o.order_number });
        dropSession(SR_SOURCE_KEY);
        if (fromCart) clear();
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
      .catch(() => {
        if (tries > 1) setTimeout(() => confirm(tries - 1), 2500);
        else setState({ phase: 'pending' });
      });
    confirm(3);
  }, [order, oid, ost, clear]);

  const { phase } = state;
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        {phase === 'failed' ? (
          <>
            <span className="eyebrow">Payment not completed</span>
            <h1>Your order isn&rsquo;t placed yet</h1>
            <p>The checkout didn&rsquo;t go through{state.ost ? ` (${state.ost.toLowerCase()})` : ''}, so nothing was charged. You can try again whenever you&rsquo;re ready.</p>
          </>
        ) : phase === 'none' ? (
          <>
            <span className="eyebrow">Orders</span>
            <h1>No order to show</h1>
            <p>Your orders are listed in your account.</p>
          </>
        ) : (
          <>
            <span className="eyebrow">Thank you</span>
            <h1>{phase === 'loading' ? 'Confirming your order…' : 'Order placed!'}</h1>
            <p>
              {phase === 'done' ? <>Order <b>#{state.orderNumber}</b> is confirmed. We&rsquo;ll send updates to you on WhatsApp.</> : null}
              {phase === 'pending' ? <>Your order is received. We&rsquo;ll send the order number and updates to you on WhatsApp.</> : null}
              {phase === 'loading' ? <>This takes a moment.</> : null}
            </p>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
        {phase === 'done' ? (
          <Link href={`/track-order?order=${encodeURIComponent(state.orderNumber)}`} className="btn btn-primary">
            <Icon name="Truck" size={16} /> Track your order
          </Link>
        ) : null}
        {phase === 'failed' ? <button type="button" className="btn btn-primary" onClick={openCart}>Open my cart</button> : null}
        <Link href={id ? `/account/orders/${id}` : '/account/orders'} className="btn">My orders</Link>
        <Link href="/products" className="btn">Continue shopping</Link>
      </div>
    </div>
  );
}
