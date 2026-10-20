import Link from 'next/link';
import { getPost } from '@/lib/api/blog';
import { richHtml } from '@/lib/sanitizeHtml';
import { absUrl, pageMeta } from '@/lib/site';
import { ik } from '@/lib/imagekit';
import SkImg from '../../_components/SkImg';

export const revalidate = 600;

const fmtDate = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };
const load = async (slug) => { try { return await getPost(slug); } catch { return null; } };

export async function generateMetadata({ params }) {
  const post = await load(params.slug);
  if (!post?.title) return { title: 'Journal — Velmique', robots: { index: false, follow: true } };
  return pageMeta({
    title: `${post.title} — Velmique Journal`,
    description: post.excerpt?.slice(0, 160),
    path: `/journal/${post.slug || params.slug}`,
    image: post.coverImage || undefined,
    type: 'article',
    extra: { openGraph: { publishedTime: post.publishedAt, authors: [post.author?.name].filter(Boolean) } },
  });
}

export default async function MaisonJournalPost({ params }) {
  const post = await load(params.slug);

  if (!post?.title) {
    return (
      <section className="m-section"><div className="m-wrap" style={{ textAlign: 'center' }}>
        <span className="m-eyebrow">Not found</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', margin: '14px 0 18px' }}>This story has drifted away.</h1>
        <Link className="m-btn m-btn--fill" href="/journal" style={{ justifyContent: 'center' }}>Back to the journal</Link>
      </div></section>
    );
  }

  const url = absUrl(`/journal/${post.slug || params.slug}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: (post.excerpt || '').slice(0, 200),
    ...(post.coverImage ? { image: post.coverImage } : {}),
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: post.author?.name || 'Velmique' },
    publisher: { '@type': 'Organization', name: 'Velmique', logo: { '@type': 'ImageObject', url: absUrl('/logo.webp') } },
    mainEntityOfPage: url,
  };

  return (
    <article className="m-section"><div className="m-wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="m-hero--article">
        <nav className="m-crumb" aria-label="Breadcrumb"><Link href="/journal">Journal</Link> / <span>{post.category || 'Story'}</span></nav>
        <h1 style={{ fontSize: 'clamp(32px,5vw,58px)' }}>{post.title}</h1>
        <p style={{ color: 'var(--m-ink-faint)', marginTop: 14, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          By {post.author?.name || 'Velmique'} · <time dateTime={post.publishedAt}>{fmtDate(post.publishedAt)}</time> · {post.readTime} min read
        </p>
        {post.coverImage ? <SkImg src={ik(post.coverImage, 1400)} alt="" fetchPriority="high" /> : null}
      </div>
      <div className="m-prose" style={{ marginTop: 40 }} {...richHtml(post.body || `<p>${post.excerpt || ''}</p>`)} />
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <Link className="m-btn m-btn--ghost" href="/journal">More from the journal <span className="m-arrow">→</span></Link>
      </div>
    </div></article>
  );
}
