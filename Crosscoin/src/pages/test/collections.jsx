import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I, Thumb } from '../../components/test/ui';
import { fetchCategories } from '../../components/test/real';

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
          ? <div className="catgrid" style={{ marginTop: 24 }}>{Array.from({ length: 8 }).map((_, i) => <div className="cc-skel cc-skelblock" style={{ minHeight: 220 }} key={i} aria-hidden="true" />)}</div>
          : (
            <div className="catgrid" style={{ marginTop: 24 }}>
              {cats.map((c) => (
                <button className="cattile" key={c.id || c.name} onClick={() => router.push(`/test/shop?cat=${encodeURIComponent(c.name)}`)}>
                  <span className="cattile__img"><Thumb src={c.img} /></span>
                  <span className="cattile__bar"><b>{c.name.replace(/^Cross ?Coin®?\s*/i, '')}</b><span className="cattile__ar">{I.arrow(16)}</span></span>
                </button>
              ))}
            </div>
          )}
      </div>
    </TestLayout>
  );
}
