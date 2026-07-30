import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import { getBlogBySlug, getBlogPosts } from '@/lib/api';

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);
  return post ? { title: post.title, description: post.excerpt } : { title: 'Article' };
}

export default async function JournalArticlePage({ params }) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);
  if (!post) notFound();

  const initial = (post.author || 'S').trim().charAt(0).toUpperCase();

  return (
    <div className="container sx-article" style={{ paddingTop: 24, paddingBottom: 56 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/journal">Journal</Link> <span>/</span> <b>{post.title}</b>
      </nav>

      <header className="sx-article-head">
        {post.category && <span className="sx-article-cat">{post.category}</span>}
        <h1 className="sx-article-title">{post.title}</h1>
        <div className="sx-article-meta">
          <span className="sx-article-author"><span className="sx-article-avatar" aria-hidden>{initial}</span>{post.author}</span>
          {post.date && <><i>·</i><span>{post.date}</span></>}
          {post.readTime && <><i>·</i><span>{post.readTime}</span></>}
        </div>
      </header>

      {post.image && (
        <div className="sx-article-hero">
          <img src={post.image} alt={post.title} />
        </div>
      )}

      <div className="sx-article-grid">
        <div className="sx-article-body">
          {post.sections && post.sections.length > 0 ? (
            post.sections.map((s, i) => (
              <section key={i}>
                {s.heading && <h2>{s.heading}</h2>}
                {s.content && <div dangerouslySetInnerHTML={{ __html: s.content }} />}
              </section>
            ))
          ) : (
            <p>{post.excerpt}</p>
          )}

          <Link href="/journal" className="sx-article-back">
            <Icon name="ArrowRight" size={14} /> Back to all articles
          </Link>
        </div>

        <aside className="sx-article-aside">
          <div className="sx-article-card">
            <span className="sx-article-card-label">Written by</span>
            <div className="sx-article-author big"><span className="sx-article-avatar" aria-hidden>{initial}</span>{post.author}</div>
          </div>

          {post.tags?.length > 0 && (
            <div className="sx-article-card">
              <span className="sx-article-card-label">Tags</span>
              <div className="sx-article-tags">
                {post.tags.map((t) => <span className="sx-article-tag" key={t}>{t}</span>)}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
