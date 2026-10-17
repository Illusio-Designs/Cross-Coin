import Head from 'next/head';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I } from '../../components/test/ui';

export default function TestThankYou() {
  const router = useRouter();
  const orderNo = router.query.order_number || router.query.order || '';
  const eta = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 5);
    try { return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); } catch (_) { return ''; }
  }, []);

  return (
    <TestLayout>
      <Head><title>Order confirmed — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>
      <div className="wrap" style={{ maxWidth: 560, paddingBlock: '48px 70px', textAlign: 'center' }}>
        <div className="tyseal">{I.check(34)}</div>
        <h1 style={{ fontFamily: 'Fraunces,serif', fontSize: 'clamp(26px,5vw,40px)', margin: '20px 0 8px' }}>Order placed</h1>
        {orderNo
          ? <p className="mono" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>Order <b style={{ color: 'var(--crimson)' }}>{orderNo}</b> is confirmed.</p>
          : <p className="mono" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>Your order is confirmed.</p>}
        <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.6, marginTop: 10 }}>
          A confirmation has been sent to your email. Estimated delivery by <b>{eta}</b>.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26 }}>
          <button className="btn btn--crimson btn--lg" onClick={() => router.push('/test/shop')}>Continue shopping</button>
          <button className="btn btn--lg" onClick={() => router.push(orderNo ? `/test/track?order=${encodeURIComponent(orderNo)}` : '/test/track')}>Track your order</button>
        </div>
      </div>
    </TestLayout>
  );
}
