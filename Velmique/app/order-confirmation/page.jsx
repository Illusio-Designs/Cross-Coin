import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pageMeta } from '@/lib/site';

export const metadata = pageMeta({ title: 'Order Confirmed — Velmique Maison de Parfum', description: 'Your Velmique order.', path: '/order-confirmation', noindex: true });

/* Reached from our own bag checkout → ?order=<order number> (the Purchase is
   tracked when the order is placed). A bare hit has no order to show, so it
   goes to the account's order list. */
export default function OrderConfirmation({ searchParams }) {
  const ownOrder = (searchParams?.order || '').toString().slice(0, 64);
  if (!ownOrder) redirect('/account');
  const order = ownOrder;
  return (
    <section className="m-section"><div className="m-wrap m-oc">
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
        <Link className="m-btn m-btn--fill" href={`/track-order?order=${encodeURIComponent(ownOrder)}`}>Track your order <span className="m-arrow">→</span></Link>
        <Link className="m-btn" href="/account">My orders</Link>
        <Link className="m-btn" href="/shop">Continue shopping</Link>
      </div>
    </div></section>
  );
}
