import Head from 'next/head';
import { R } from '@/components/test/routes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I } from '../../components/test/ui';
import { clearCart } from '../../components/test/store';
import { fbqTrack } from '@/utils/fbqTrack';
import { confirmShiprocketOrder, SR_SOURCE_KEY } from '../../lib/shiprocketCheckout';
import { takePurchaseForThankYou } from '../../lib/thankYou';

const readSession = (k) => { try { return sessionStorage.getItem(k); } catch (_) { return null; } };
const dropSession = (k) => { try { sessionStorage.removeItem(k); } catch (_) { /* blocked */ } };

/* The thank-you page after every order (/thank-you and /order-confirmation):
     our own checkout      → ?order=<order number>  (older links: ?order_number=)
     Shiprocket Checkout   → ?oid=<Shiprocket order>&ost=<status>
   The Purchase fires here, once, with the event id Purchase_<order number> —
   the same id the server's Conversions API event uses, so Meta counts the
   sale once.
   - Our own checkout: the order is already saved; its Purchase details come
     from sessionStorage (no details → it was already fired, nothing sent).
   - Shiprocket: on SUCCESS our backend confirms the order with Shiprocket and
     answers with our order number; any other status means the payment didn't
     complete. A checkout started from the cart empties the cart once the
     order is confirmed; a single Buy now leaves the cart alone. */
export default function TestThankYou() {
  const router = useRouter();
  const q = router.query;
  const order = String(q.order_number || q.order || '').slice(0, 64);
  const oid = String(q.oid || '').slice(0, 64);
  const ost = String(q.ost || '').toUpperCase().slice(0, 32);
  const key = `${order}|${oid}|${ost}`;
  // Shiprocket confirmation result for `key`: { key, phase: 'done' | 'pending', orderNumber }.
  const [sr, setSr] = useState({ key: '' });
  const handled = useRef('');
  const eta = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 5);
    try { return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); } catch (_) { return ''; }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (handled.current === key) return;
    handled.current = key;

    if (order) {
      const data = takePurchaseForThankYou(order);
      if (data) {
        try { fbqTrack('Purchase', data, { eventID: 'Purchase_' + order }); } catch (_) { /* analytics never blocks the page */ }
      }
      return;
    }
    if (!oid || ost !== 'SUCCESS') return;

    const fromCart = readSession(SR_SOURCE_KEY) === 'cart';
    // Shiprocket may need a moment to have the order ready: try 3 times.
    const confirm = (tries) => confirmShiprocketOrder(oid)
      .then((o) => {
        if (handled.current !== key) return;
        setSr({ key, phase: 'done', orderNumber: o.order_number });
        dropSession(SR_SOURCE_KEY);
        if (fromCart) clearCart();
        const contents = o.items || [];
        try {
          fbqTrack('Purchase', {
            content_ids: contents.map((i) => String(i.id)), content_type: 'product',
            contents,
            num_items: contents.reduce((s, i) => s + (i.quantity || 1), 0),
            value: Number(o.value || 0), currency: 'INR',
          }, { eventID: 'Purchase_' + o.order_number });
        } catch (_) { /* analytics never blocks the page */ }
      })
      .catch(() => {
        if (handled.current !== key) return;
        if (tries > 1) setTimeout(() => confirm(tries - 1), 2500);
        else setSr({ key, phase: 'pending' });
      });
    confirm(3);
  }, [router.isReady, key, order, oid, ost]);

  // done (our own order, or no order in the URL) | failed | loading | pending.
  const phase = order || !oid ? 'done' : ost !== 'SUCCESS' ? 'failed' : sr.key === key ? sr.phase : 'loading';
  const orderNo = order || (sr.key === key ? sr.orderNumber || '' : '');
  const failed = phase === 'failed';

  return (
    <TestLayout>
      <Head><title>{failed ? 'Payment not completed — CrossCoin' : 'Order confirmed — CrossCoin Mint preview'}</title><meta name="robots" content="noindex, nofollow" /></Head>
      <div className="wrap" style={{ maxWidth: 560, paddingBlock: '48px 70px', textAlign: 'center' }}>
        {failed ? (<>
          <h1 style={{ fontFamily: 'Fraunces,serif', fontSize: 'clamp(26px,5vw,40px)', margin: '20px 0 8px' }}>Your order isn&rsquo;t placed yet</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.6, marginTop: 10 }}>
            The checkout didn&rsquo;t go through{ost ? <span className="mono"> ({ost.toLowerCase()})</span> : null}, so nothing was charged. You can try again whenever you&rsquo;re ready.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26 }}>
            <button className="btn btn--crimson btn--lg" onClick={() => window.dispatchEvent(new CustomEvent('cc-test-opencart'))}>Open my cart</button>
            <button className="btn btn--lg" onClick={() => router.push(R.shop)}>Continue shopping</button>
          </div>
        </>) : (<>
          <div className="tyseal">{I.check(34)}</div>
          <h1 style={{ fontFamily: 'Fraunces,serif', fontSize: 'clamp(26px,5vw,40px)', margin: '20px 0 8px' }}>{phase === 'loading' ? 'Confirming your order…' : 'Order placed'}</h1>
          {phase === 'loading'
            ? <p className="mono" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>This takes a moment.</p>
            : phase === 'pending'
              ? <p className="mono" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>Your order is received. We&rsquo;ll send the order number and updates to you.</p>
              : orderNo
                ? <p className="mono" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>Order <b style={{ color: 'var(--crimson)' }}>{orderNo}</b> is confirmed.</p>
                : <p className="mono" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>Your order is confirmed.</p>}
          {phase !== 'loading' && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.6, marginTop: 10 }}>
              A confirmation has been sent to your email. Estimated delivery by <b>{eta}</b>.
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26 }}>
            <button className="btn btn--crimson btn--lg" onClick={() => router.push(R.shop)}>Continue shopping</button>
            <button className="btn btn--lg" onClick={() => router.push(orderNo ? `${R.track}?order=${encodeURIComponent(orderNo)}` : R.track)}>Track your order</button>
          </div>
        </>)}
      </div>
    </TestLayout>
  );
}
