import Head from 'next/head';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I } from '../../components/test/ui';

export default function TestAccount() {
  const router = useRouter();
  const tiles = [
    ['Track an order', 'See live status with your order number.', '/test/track'],
    ['Your wishlist', 'Everything you saved to buy later.', '/test/wishlist'],
    ['Shop the mint', 'Browse the full catalogue.', '/test/shop'],
    ['Help & FAQ', 'Shipping, returns and sizing answered.', '/test#faq'],
  ];
  return (
    <TestLayout>
      <Head><title>Account — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / Account</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>Your account</h2>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60, maxWidth: 820 }}>
        <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 12.5, padding: '18px 0 4px' }}>Sign-in isn&rsquo;t enabled in this preview — you can still track orders and manage your wishlist below.</p>
        <div className="collgrid" style={{ marginTop: 16 }}>
          {tiles.map(([t, d, href]) => (
            <button className="acctile" key={t} onClick={() => router.push(href)}>
              <span className="acctile__ic">{I.arrow(18)}</span>
              <b>{t}</b>
              <span className="acctile__d">{d}</span>
            </button>
          ))}
        </div>
      </div>
    </TestLayout>
  );
}
