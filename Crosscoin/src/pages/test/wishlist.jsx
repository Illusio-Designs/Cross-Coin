import Head from 'next/head';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard } from '../../components/test/ui';
import { useWishlist, clearWishlist } from '../../components/test/wishlist';

export default function TestWishlist() {
  const router = useRouter();
  const items = useWishlist();

  return (
    <TestLayout>
      <Head><title>Wishlist — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / Wishlist</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>Your wishlist</h2>
            {items.length > 0 && <button className="chip" onClick={() => clearWishlist()}>Clear all</button>}
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60 }}>
        {items.length === 0
          ? (
            <div style={{ padding: '46px 0', textAlign: 'center' }}>
              <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, marginBottom: 16 }}>Nothing saved yet — tap the ♥ on any product to keep it here.</p>
              <button className="btn btn--crimson btn--lg" onClick={() => router.push('/test/shop')}>Browse the mint</button>
            </div>
          )
          : <div className="pgrid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </div>
    </TestLayout>
  );
}
