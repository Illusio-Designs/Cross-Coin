import Head from 'next/head';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I } from '../../components/test/ui';

export default function TestAccount() {
  const router = useRouter();
  const tiles = [
    ['Track an order', 'Live status by order number or AWB.', '/test/track'],
    ['Returns', 'Start a return within 7 days.', '/test/returns'],
    ['Your wishlist', 'Everything you saved to buy later.', '/test/wishlist'],
    ['Shop the mint', 'Browse the full catalogue.', '/test/shop'],
    ['Help & FAQ', 'Shipping, returns and sizing answered.', '/test#faq'],
    ['Contact us', 'WhatsApp, email and office hours.', '/test/contact'],
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

      <div className="wrap" style={{ paddingBottom: 60, maxWidth: 860 }}>
        {/* Sign-in card */}
        <div className="acctsignin">
          <div className="acctsignin__ic">{I.user(26)}</div>
          <div className="acctsignin__t">
            <b>Sign in to CrossCoin</b>
            <span>Track orders, save addresses and get member offers. You can also check out as a guest.</span>
          </div>
          <div className="acctsignin__btns">
            <button className="btn btn--crimson" onClick={() => router.push('/test/login')}>Sign in</button>
            <button className="btn" onClick={() => router.push('/test/register')}>Create account</button>
          </div>
        </div>

        {/* Orders empty state */}
        <div className="acctorders">
          <div className="optlabel" style={{ marginBottom: 10 }}>Recent orders</div>
          <div className="acctempty mono">No orders to show here yet — track a guest order by its number on the <a onClick={() => router.push('/test/track')} style={{ color: 'var(--crimson)', cursor: 'pointer' }}>Track order</a> page.</div>
        </div>

        <div className="collgrid" style={{ marginTop: 22 }}>
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
