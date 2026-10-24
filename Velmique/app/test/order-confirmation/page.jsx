import Link from 'next/link';

export const metadata = {
  title: 'Order Confirmed — Velmique Maison de Parfum',
  robots: { index: false },
};

export default function TestOrderConfirmation({ searchParams }) {
  // `order` comes from our own drawer checkout; `oid`/`ost` come from the
  // custom-checkout redirect (?oid=<platform order>&ost=SUCCESS).
  const ost = (searchParams?.ost || '').toString().toUpperCase();
  const order = (searchParams?.order || (ost === 'SUCCESS' ? searchParams?.oid : '') || '').toString();
  return (
    <section className="m-section"><div className="m-wrap m-oc">
      <div className="m-oc__badge">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
      <span className="m-eyebrow">Merci beaucoup</span>
      <h1>Order Placed.</h1>
      <p className="m-oc__lede">
        Thank you for your order{order ? <> — <b>#{order}</b> is confirmed</> : null}.
        We&rsquo;ve sent the details to you on WhatsApp.
      </p>
      <div className="m-oc__steps">
        <div><i>1</i><b>Confirmed</b><span>Order received &amp; payment verified</span></div>
        <div><i>2</i><b>Dispatched</b><span>Packed &amp; shipped within 24–48 hours</span></div>
        <div><i>3</i><b>Delivered</b><span>At your door in 3–7 working days</span></div>
      </div>
      <div className="m-oc__cta">
        {order ? <Link className="m-btn m-btn--fill" href={`/test/track-order?order=${encodeURIComponent(order)}`}>Track your order <span className="m-arrow">→</span></Link> : null}
        <Link className="m-btn" href="/test/shop">Continue shopping</Link>
      </div>
    </div></section>
  );
}
