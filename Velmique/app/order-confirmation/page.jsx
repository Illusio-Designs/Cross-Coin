import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pageMeta } from '@/lib/site';
import CheckoutReturn from './CheckoutReturn';

export const metadata = pageMeta({ title: 'Order Confirmed — Velmique Maison de Parfum', description: 'Your Velmique order.', path: '/order-confirmation', noindex: true });

/* The thank-you page after every order. The browser Purchase fires here,
   once, with the event id Purchase_<order number> — the same id the server's
   Conversions API event uses, so Meta counts the sale once. Two ways in:
   - our own bag checkout → ?order=<order number>. The order is already
     saved; CheckoutReturn fires the Purchase with the details the bag handed
     over via sessionStorage (lib/thankYou.js);
   - Shiprocket Checkout's redirect → ?oid=<platform order>&ost=<status>.
     On SUCCESS, CheckoutReturn confirms the order with the backend, then
     tracks the Purchase under our own order number, and empties the bag if
     the checkout was started from it (a single Buy now leaves it alone); any
     other status means the payment didn't complete.
   A bare hit has no order to show, so it goes to the account's order list. */
export default function OrderConfirmation({ searchParams }) {
  const ost = (searchParams?.ost || '').toString().toUpperCase();
  const oid = (searchParams?.oid || '').toString().slice(0, 64);
  const ownOrder = (searchParams?.order || '').toString().slice(0, 64);

  if (!ownOrder && !oid) redirect('/account');

  if (oid && ost !== 'SUCCESS') {
    return (
      <section className="m-section"><div className="m-wrap m-oc">
        <div className="m-oc__badge m-oc__badge--warn" aria-hidden="true">!</div>
        <span className="m-eyebrow">Payment not completed</span>
        <h1>Your order isn&rsquo;t placed yet.</h1>
        <p className="m-oc__lede">The checkout didn&rsquo;t go through{ost ? ` (${ost.toLowerCase()})` : ''}, so nothing was charged. Your bag is saved — you can try again whenever you&rsquo;re ready.</p>
        <CheckoutReturn mode="retry" />
      </div></section>
    );
  }

  const order = ownOrder || oid;
  return (
    <section className="m-section"><div className="m-wrap m-oc">
      {ownOrder ? <CheckoutReturn mode="own" orderNumber={ownOrder} /> : <CheckoutReturn mode="success" orderId={oid} />}
      <div className="m-oc__badge" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
      <span className="m-eyebrow">Merci beaucoup</span>
      <h1>Order Placed.</h1>
      <p className="m-oc__lede">
        Thank you for your order — <b>#{order}</b> is confirmed.
        We&rsquo;ll send updates to you on WhatsApp.
      </p>
      <div className="m-oc__steps">
        <div><i>1</i><b>Confirmed</b><span>Order received</span></div>
        <div><i>2</i><b>Dispatched</b><span>Packed &amp; shipped within 24–48 hours</span></div>
        <div><i>3</i><b>Delivered</b><span>At your door in 3–7 working days</span></div>
      </div>
      <div className="m-oc__cta">
        {ownOrder ? <Link className="m-btn m-btn--fill" href={`/track-order?order=${encodeURIComponent(ownOrder)}`}>Track your order <span className="m-arrow">→</span></Link> : null}
        <Link className="m-btn" href="/account">My orders</Link>
        <Link className="m-btn" href="/shop">Continue shopping</Link>
      </div>
    </div></section>
  );
}
