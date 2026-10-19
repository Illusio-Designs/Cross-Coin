import Link from 'next/link';
import { getPost } from '@/lib/api/blog';

const fmtDate = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };

export async function generateMetadata({ params }) {
  let post = null;
  try { post = await getPost(params.slug); } catch { post = null; }
  if (!post) return { title: 'Journal — Velmique' };
  return {
    title: `${post.title} — Velmique Journal`,
    description: post.excerpt?.slice(0, 160),
    openGraph: { title: post.title, description: post.excerpt?.slice(0, 160), images: post.coverImage ? [post.coverImage] : [] },
  };
}

export default async function MaisonJournalPost({ params }) {
  let post = null;
  try { post = await getPost(params.slug); } catch { post = null; }

  if (!post) {
    return (
      <section className="m-section"><div className="m-wrap" style={{ textAlign: 'center' }}>
        <span className="m-eyebrow">Not found</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', margin: '14px 0 18px' }}>This story has drifted away.</h1>
        <Link className="m-btn m-btn--fill" href="/test/journal" style={{ justifyContent: 'center' }}>Back to the journal</Link>
      </div></section>
    );
  }

  return (
    <article className="m-section"><div className="m-wrap">
      <div className="m-hero--article">
        <nav className="m-crumb"><Link href="/test/journal">Journal</Link> / <span>{post.category || 'Story'}</span></nav>
        <h1 style={{ fontSize: 'clamp(32px,5vw,58px)' }}>{post.title}</h1>
        <p style={{ color: 'var(--m-ink-faint)', marginTop: 14, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          By {post.author?.name || 'Velmique'} · {fmtDate(post.publishedAt)} · {post.readTime} min read
        </p>
        {post.coverImage ? <img src={post.coverImage} alt={post.title} /> : null}
      </div>
      <div className="m-prose" style={{ marginTop: 40 }} dangerouslySetInnerHTML={{ __html: post.body || `<p>${post.excerpt || ''}</p>` }} />
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <Link className="m-btn m-btn--ghost" href="/test/journal">More from the journal <span className="m-arrow">→</span></Link>
      </div>
    </div></article>
  );
}
