import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PageHero from '../components/common/PageHero';
import { useCart } from '../context/CartContext';
import { confirmShiprocketOrder, SR_SOURCE_KEY } from '../services/shiprocketCheckout';
import { fbPurchase } from '../utils/pixel';
import { takePurchaseForThankYou } from '../lib/thankYou';

const readSession = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const dropSession = (k) => { try { sessionStorage.removeItem(k); } catch { /* blocked */ } };

/* The thank-you page after every order:
     our own checkout      → ?order=<order number>
     Shiprocket Checkout   → ?oid=<Shiprocket order>&ost=<status>
   The Purchase fires here, once, with the event id Purchase_<order number> —
   the same id the server's Conversions API event uses, so Meta counts the
   sale once.
   - Our own checkout: the order is already saved; its details come from
     sessionStorage (lib/thankYou.js).
   - Shiprocket: on SUCCESS our backend confirms the order with Shiprocket and
     answers with our order number; any other status means the payment didn't
     complete. A checkout started from the cart empties the cart once the
     order is confirmed; a single Buy now leaves the cart alone.
   Not indexed (noindex here, /order-confirmation disallowed in robots.txt). */
export default function OrderConfirmation() {
  const router = useRouter();
  // The query is only known once the router is ready (static page).
  if (!router.isReady) return <ThankYou order="" oid="" ost="" waiting />;
  const q = router.query;
  const order = String(q.order || '').slice(0, 64);
  const oid = String(q.oid || '').slice(0, 64);
  const ost = String(q.ost || '').toUpperCase().slice(0, 32);
  return <ThankYou key={order || oid} order={order} oid={oid} ost={ost} />;
}

function ThankYou({ order, oid, ost, waiting = false }) {
  const { clearCart, openCart, hydrated } = useCart();
  const [state, setState] = useState(() => {
    if (waiting) return { phase: 'loading' };
    if (order) return { phase: 'done', orderNumber: order };
    if (!oid) return { phase: 'none' };
    return ost === 'SUCCESS' ? { phase: 'loading' } : { phase: 'failed', ost };
  });
  const done = useRef(false);
  const clearPending = useRef(false);

  useEffect(() => {
    if (waiting || done.current) return;
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
        dropSession(SR_SOURCE_KEY);
        clearPending.current = fromCart;
        setState({ phase: 'done', orderNumber: o.order_number });
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
  }, [waiting, order, oid, ost]);

  // Empty the cart only once it has loaded, so the load can't put it back.
  useEffect(() => {
    if (state.phase !== 'done' || !hydrated || !clearPending.current) return;
    clearPending.current = false;
    clearCart();
  }, [state.phase, hydrated, clearCart]);

  const { phase } = state;
  let hero;
  if (phase === 'failed') {
    hero = { eyebrow: 'Payment not completed', title: 'Not placed', accent: 'yet.', intro: `The checkout didn’t go through${state.ost ? ` (${state.ost.toLowerCase()})` : ''}, so nothing was charged. You can try again whenever you’re ready.` };
  } else if (phase === 'none') {
    hero = { eyebrow: 'Orders', title: 'No order', accent: 'to show.', intro: 'Your orders are listed in your account.' };
  } else if (phase === 'done') {
    hero = { eyebrow: 'Thank you', title: 'Order', accent: 'placed.', intro: <>Order <b className="text-ink">#{state.orderNumber}</b> is confirmed. We&rsquo;ll send updates to you on WhatsApp.</> };
  } else if (phase === 'pending') {
    hero = { eyebrow: 'Thank you', title: 'Order', accent: 'received.', intro: 'We’ll send the order number and updates to you on WhatsApp.' };
  } else {
    hero = { eyebrow: 'Thank you', title: 'Confirming', accent: 'your order…', intro: 'This takes a moment.' };
  }

  return (
    <>
      <Head>
        <title>Thank you | Gripzus</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="bg-paper">
        <PageHero eyebrow={hero.eyebrow} title={hero.title} accent={hero.accent} intro={hero.intro} />
        <div className="wrap section-y">
          <div className="flex flex-wrap gap-3">
            {phase === 'done' && (
              <Link href={`/track-order?order=${encodeURIComponent(state.orderNumber)}`} className="btn">Track your order</Link>
            )}
            {phase === 'failed' && (
              <button type="button" className="btn" onClick={openCart}>Open my cart</button>
            )}
            <Link href="/account" className="btn-outline">My orders</Link>
            <Link href="/products" className="btn-outline">Continue shopping</Link>
          </div>
        </div>
      </main>
    </>
  );
}
