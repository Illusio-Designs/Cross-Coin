'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, Truck, XCircle } from 'lucide-react';
import { useCartContext } from '@/context/CartContext';
import { confirmShiprocketOrder, SR_SOURCE_KEY } from '@/lib/api/shiprocketCheckout';
import { fbPurchase } from '@/utils/pixel';
import { takePurchaseForThankYou } from '@/lib/thankYou';

const readSession = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const dropSession = (k) => { try { sessionStorage.removeItem(k); } catch { /* blocked */ } };

const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 rounded-full bg-sage px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition-colors duration-150 hover:bg-sage-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage';
const BTN_LINK = 'text-sm text-brand-black underline underline-offset-4 hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage';

/* The thank-you page. The Purchase fires here, once, with the event id
   Purchase_<order number> — the same id the server's Conversions API event
   uses, so Meta counts the sale once.
   - Our own checkout (cart drawer): the order is already saved; its details
     come from sessionStorage.
   - Shiprocket: on SUCCESS our backend confirms the order with Shiprocket and
     answers with our order number; any other status means the payment didn't
     complete. A checkout started from the cart empties the cart once the
     order is confirmed; a single Buy now leaves the cart alone. */
export default function OrderConfirmationClient({ order, oid, ost }) {
  const { clearCart, setIsDrawerOpen, cartReady } = useCartContext();
  const [state, setState] = useState(() => {
    if (order) return { phase: 'done', orderNumber: order };
    if (!oid) return { phase: 'none' };
    return ost === 'SUCCESS' ? { phase: 'loading' } : { phase: 'failed', ost };
  });
  // Empty the cart only once it has loaded, so a late load can't refill it.
  const clearPending = useRef(false);
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
        clearPending.current = fromCart;
        setState({ phase: 'done', orderNumber: o.order_number });
        dropSession(SR_SOURCE_KEY);
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
  }, [order, oid, ost]);

  const { phase } = state;
  useEffect(() => {
    if (!clearPending.current || !cartReady || phase !== 'done') return;
    clearPending.current = false;
    clearCart();
  }, [phase, cartReady, clearCart]);

  const Mark = phase === 'failed' ? XCircle : phase === 'loading' || phase === 'pending' ? Clock : CheckCircle;
  return (
    <section className="bg-white">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        {phase !== 'none' && (
          <Mark size={48} strokeWidth={1.5} className={phase === 'failed' ? 'text-error' : phase === 'done' ? 'text-success' : 'text-gray-400'} />
        )}
        {phase === 'failed' ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Payment not completed</p>
            <h1 className="font-display text-3xl font-normal text-brand-black">Your order isn&apos;t placed yet</h1>
            <p className="max-w-md text-base leading-relaxed text-gray-600">
              The checkout didn&apos;t go through{state.ost ? ` (${state.ost.toLowerCase()})` : ''}, so nothing was charged. You can try again whenever you&apos;re ready.
            </p>
          </>
        ) : phase === 'none' ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Orders</p>
            <h1 className="font-display text-3xl font-normal text-brand-black">No order to show</h1>
            <p className="max-w-md text-base leading-relaxed text-gray-600">Your orders are listed in your account.</p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Thank you</p>
            <h1 className="font-display text-3xl font-normal text-brand-black">
              {phase === 'loading' ? 'Confirming your order…' : 'Order placed!'}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-gray-600">
              {phase === 'done' ? <>Order <b className="text-brand-black">#{state.orderNumber}</b> is confirmed. We&apos;ll send updates to you on WhatsApp.</> : null}
              {phase === 'pending' ? <>Your order is received. We&apos;ll send the order number and updates to you on WhatsApp.</> : null}
              {phase === 'loading' ? <>This takes a moment.</> : null}
            </p>
          </>
        )}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {phase === 'done' ? (
            <Link href={`/track-order?order=${encodeURIComponent(state.orderNumber)}`} className={BTN_PRIMARY}>
              <Truck size={16} /> Track your order
            </Link>
          ) : null}
          {phase === 'failed' ? (
            <button type="button" className={BTN_PRIMARY} onClick={() => setIsDrawerOpen(true)}>Open my cart</button>
          ) : null}
          <Link href="/account" className={BTN_LINK}>My orders</Link>
          <Link href="/collections/all" className={BTN_LINK}>Continue shopping</Link>
        </div>
      </div>
    </section>
  );
}
