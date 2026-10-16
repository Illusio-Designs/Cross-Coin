import Head from 'next/head';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I } from '../../components/test/ui';

const VALUES = [
  ['Quality promise', 'Every product is tested for durability, comfort and consistency before it ships.', I.shield],
  ['Built different, by design', 'We work directly with manufacturers, control every step of the supply chain, and refuse to cut corners on materials.', I.box],
  ['A growing community', 'People who refuse to settle for uncomfortable basics — and keep coming back.', I.user],
  ['Pan-India delivery', 'Shipping to every corner of India with real-time tracking on every order.', I.truck],
];

export default function TestAbout() {
  const router = useRouter();
  return (
    <TestLayout>
      <Head><title>About — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / About</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>Comfort is not a luxury</h2>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60, maxWidth: 820 }}>
        <div className="legal" style={{ marginTop: 24 }}>
          <p>Cross Coin&reg; was built on a simple belief — the things closest to your skin deserve the most attention. We craft performance socks that combine technical precision with everyday wearability.</p>
          <p>We started with a frustration most people share but rarely talk about — socks that lose shape after two washes, seams that dig in, and fabrics that trap heat. We decided to fix that.</p>
          <p>Our mission is to engineer everyday essentials that perform as hard as you do. Whether you are running a marathon, sitting through back-to-back meetings, or just going about your day — your socks should never be the problem.</p>
          <p>We work directly with manufacturers, control every step of the supply chain, and refuse to cut corners on materials. That is the Cross Coin&reg; promise.</p>
        </div>
        <div className="techgrid" style={{ marginTop: 28 }}>
          {VALUES.map(([t, d]) => (
            <div className="techcard" key={t}><div className="mk">{I.shield(22)}</div><b>{t}</b><span>{d}</span></div>
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <button className="btn btn--crimson btn--lg" onClick={() => router.push('/test/shop')}>Shop the mint {I.arrow()}</button>
        </div>
      </div>
    </TestLayout>
  );
}
