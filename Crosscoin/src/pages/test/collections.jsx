import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { fetchCategories } from '../../components/test/real';

const SWATCH = ['#ce1e36', '#180d3e', '#0f766e', '#c9a25a', '#6d28d9', '#7a1f32'];

export default function TestCollections() {
  const router = useRouter();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    fetchCategories()
      .then((c) => { if (!off) setCats(c); })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, []);

  return (
    <TestLayout>
      <Head><title>Collections — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / Collections</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>Shop by collection</h2>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60 }}>
        {loading && cats.length === 0
          ? <div className="collgrid" style={{ marginTop: 24 }}>{Array.from({ length: 6 }).map((_, i) => <div className="cc-skel cc-skelblock" style={{ minHeight: 170 }} key={i} aria-hidden="true" />)}</div>
          : (
            <div className="collgrid">
              {cats.map((c, i) => (
                <button className="collcard" key={c.id || c.name} style={{ background: SWATCH[i % SWATCH.length] }} onClick={() => router.push(`/test/shop?cat=${encodeURIComponent(c.name)}`)}>
                  <span className="collcard__no">0{i + 1}</span>
                  <span className="collcard__name">{c.name}</span>
                  {c.count != null && <span className="collcard__ct">{c.count} styles</span>}
                </button>
              ))}
            </div>
          )}
      </div>
    </TestLayout>
  );
}
