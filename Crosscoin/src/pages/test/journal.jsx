import Head from 'next/head';
import { R } from '@/components/test/routes';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { fetchBlogs } from '../../components/test/real';

const GRADS = ['linear-gradient(150deg,#ffd7dd,#ffbac4)', 'linear-gradient(150deg,#d7cff2,#bcb0e8)', 'linear-gradient(150deg,#cdeee6,#aee0d3)'];

export default function TestJournal({ preview = true }) {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    fetchBlogs(24)
      .then((p) => { if (!off) setPosts(p); })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, []);

  return (
    <TestLayout>
      {preview && <Head><title>Journal — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>}

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push(R.home)}>Home</span> / Journal</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>The ledger</h2>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60 }}>
        {loading && posts.length === 0
          ? <div className="jgrid" style={{ paddingTop: 20 }}>{Array.from({ length: 6 }).map((_, i) => <div className="cc-skel cc-skelblock" style={{ height: 230 }} key={i} aria-hidden="true" />)}</div>
          : posts.length === 0
            ? <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '30px 0' }}>No journal posts yet.</p>
            : (
              <div className="jgrid" style={{ paddingTop: 20 }}>
                {posts.map((b, i) => (
                  <a className="post" key={b.slug || i} onClick={() => b.slug && router.push(R.blog(b.slug))} style={{ cursor: b.slug ? 'pointer' : 'default' }}>
                    <div className="post__img" style={{ background: GRADS[i % GRADS.length], overflow: 'hidden' }}>{b.img && <img src={b.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                    <div className="post__b"><div className="m">{b.tag}</div><h3>{b.title}</h3></div>
                  </a>
                ))}
              </div>
            )}
      </div>
    </TestLayout>
  );
}
