import Head from 'next/head';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I } from '../../components/test/ui';

const VALUES = [
  ['Premium materials', 'Long-staple combed cotton and tested blends that stay soft and hold shape wash after wash.'],
  ['Tested to last', 'Every batch goes through wash, stretch and wear tests before it reaches your door.'],
  ['Honest pricing', 'We work directly with manufacturers and control the supply chain — no middleman markup.'],
  ['Made in India', 'Designed and manufactured in Morbi, Gujarat, with a 7-day easy return promise.'],
];

export default function TestAbout() {
  const router = useRouter();
  return (
    <TestLayout>
      <Head><title>About — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / About</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>The Cross Coin&reg; promise</h2>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60, maxWidth: 820 }}>
        <div className="legal" style={{ marginTop: 24 }}>
          <p>At Cross Coin&reg;, we started with a frustration most people share but rarely talk about — socks that lose shape after two washes, seams that dig in, and fabrics that trap heat. We decided to fix that.</p>
          <p>We work directly with manufacturers, control every step of the supply chain, and refuse to cut corners on materials. That is the Cross Coin&reg; promise — everyday essentials, minted to a standard and priced without the markup.</p>
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
