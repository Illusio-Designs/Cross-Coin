import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../../components/test/TestLayout';
import { fetchBlog } from '../../../components/test/real';
import { richHtml } from '../../../utils/sanitizeHtml';

const fmt = (d) => { try { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; } catch (_) { return ''; } };

export default function TestBlog() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let off = false;
    setLoading(true);
    fetchBlog(slug)
      .then((p) => { if (!off) setPost(p); })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [slug]);

  return (
    <TestLayout>
      <Head><title>{post?.title ? `${post.title} — CrossCoin` : 'Journal — CrossCoin Mint preview'}</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="wrap" style={{ paddingBottom: 70, maxWidth: 820 }}>
        <div className="crumbs" style={{ paddingTop: 20 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / <span style={{ cursor: 'pointer' }} onClick={() => router.push('/test#journal')}>Journal</span> / {post?.title || '…'}
        </div>

        {loading
          ? <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '30px 0' }}>Loading article…</p>
          : !post
            ? <p className="mono" style={{ fontSize: 13, padding: '30px 0' }}>Article not found. <a style={{ color: 'var(--crimson)', cursor: 'pointer' }} onClick={() => router.push('/test#journal')}>Back to journal</a></p>
            : (<>
                <div className="artmeta" style={{ marginTop: 14 }}>
                  <span className="artcat">{post.cat}</span>
                  {post.author && <span className="mono">· {post.author}</span>}
                  {post.date && <span className="mono">· {fmt(post.date)}</span>}
                </div>
                <h1 className="arttitle">{post.title}</h1>
                {post.img && <div className="arthero"><img src={post.img} alt={post.title} /></div>}
                <article className="legal">
                  {post.sections.length
                    ? post.sections.map((s, i) => (
                        <section key={i} style={{ marginBottom: 18 }}>
                          {s.heading && <h2 style={{ fontSize: 22, margin: '18px 0 8px' }}>{s.heading}</h2>}
                          {s.html && <div {...richHtml(s.html)} />}
                        </section>
                      ))
                    : (post.content ? <div {...richHtml(post.content)} /> : <p className="mono" style={{ color: 'var(--ink-faint)' }}>No content.</p>)}
                </article>
              </>)}
      </div>
    </TestLayout>
  );
}
