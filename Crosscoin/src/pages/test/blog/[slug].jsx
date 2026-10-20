import Head from 'next/head';
import { R } from '@/components/test/routes';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../../components/test/TestLayout';
import { fetchBlog } from '../../../components/test/real';
import { toast, Sk, SkBusy, TextSkeleton, Thumb } from '../../../components/test/ui';
import { richHtml } from '../../../utils/sanitizeHtml';

const fmt = (d) => { try { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; } catch (_) { return ''; } };
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export default function TestBlog({ preview = true }) {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marked, setMarked] = useState(false);

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

  useEffect(() => { try { setMarked(JSON.parse(localStorage.getItem('cc_test_bookmarks') || '[]').includes(slug)); } catch (_) {} }, [slug]);

  const toc = useMemo(() => (post?.sections || []).filter((s) => s.heading).map((s) => ({ heading: s.heading, id: slugify(s.heading) })), [post]);

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try { if (navigator.share) { await navigator.share({ title: post?.title || 'CrossCoin Journal', url }); return; } } catch (_) {}
    try { await navigator.clipboard.writeText(url); toast('Link copied ✓'); } catch (_) { toast('Copy the URL from your address bar'); }
  };
  const bookmark = () => {
    try {
      const list = JSON.parse(localStorage.getItem('cc_test_bookmarks') || '[]');
      const next = list.includes(slug) ? list.filter((x) => x !== slug) : [...list, slug];
      localStorage.setItem('cc_test_bookmarks', JSON.stringify(next));
      setMarked(next.includes(slug));
      toast(next.includes(slug) ? 'Saved to bookmarks ★' : 'Removed bookmark');
    } catch (_) {}
  };

  return (
    <TestLayout>
      {preview && <Head><title>{post?.title ? `${post.title} — CrossCoin` : 'Journal — CrossCoin Mint preview'}</title><meta name="robots" content="noindex, nofollow" /></Head>}

      <div className="wrap" style={{ paddingBottom: 70, maxWidth: 820 }}>
        <div className="crumbs" style={{ paddingTop: 20 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => router.push(R.home)}>Home</span> / <span style={{ cursor: 'pointer' }} onClick={() => router.push(R.journal)}>Journal</span> / {post?.title || '…'}
        </div>

        {loading || !router.isReady
          ? (
            // Article skeleton: meta row, title, share bar, 16:9 hero, body.
            <SkBusy label="Loading article…">
              <div className="artmeta" style={{ marginTop: 14 }} aria-hidden="true"><Sk w={74} h={22} /><Sk w={90} h={12} /><Sk w={84} h={12} /></div>
              <Sk w="94%" h="clamp(28px, 5vw, 44px)" style={{ margin: '12px 0 8px' }} />
              <Sk w="60%" h="clamp(28px, 5vw, 44px)" style={{ marginBottom: 16 }} />
              <div className="artbar" aria-hidden="true"><Sk w={92} h={38} /><Sk w={110} h={38} /></div>
              <div className="arthero sk-frame" aria-hidden="true"><Sk className="sk-fill" /></div>
              <TextSkeleton paras={3} lines={4} />
            </SkBusy>
          )
          : !post
            ? <p className="mono" style={{ fontSize: 13, padding: '30px 0' }}>Article not found. <a style={{ color: 'var(--crimson)', cursor: 'pointer' }} onClick={() => router.push(R.journal)}>Back to journal</a></p>
            : (<>
                <div className="artmeta" style={{ marginTop: 14 }}>
                  <span className="artcat">{post.cat}</span>
                  {post.author && <span className="mono">· {post.author}</span>}
                  {post.date && <span className="mono">· {fmt(post.date)}</span>}
                </div>
                <h1 className="arttitle">{post.title}</h1>

                <div className="artbar">
                  <button className="artbtn" onClick={share}>{/* share */}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg> Share</button>
                  <button className={`artbtn${marked ? ' on' : ''}`} onClick={bookmark}>{marked ? '★' : '☆'} {marked ? 'Saved' : 'Bookmark'}</button>
                </div>

                {post.img && <div className="arthero"><Thumb src={post.img} alt={post.title} w={1400} priority /></div>}

                {toc.length > 1 && (
                  <nav className="arttoc">
                    <div className="arttoc__h mono">In this article</div>
                    <ol>{toc.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.heading}</a></li>)}</ol>
                  </nav>
                )}

                <article className="legal">
                  {post.sections.length
                    ? post.sections.map((s, i) => (
                        <section key={i} style={{ marginBottom: 18 }}>
                          {s.heading && <h2 id={slugify(s.heading)} style={{ fontSize: 22, margin: '18px 0 8px', scrollMarginTop: 90 }}>{s.heading}</h2>}
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
