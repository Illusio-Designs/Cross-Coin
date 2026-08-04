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

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 50 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/journal">Journal</Link> <span>/</span> <b>{post.title}</b>
      </nav>

      <article className="article">
        <div className="article-meta">
          {post.category && <span className="blog-cat">{post.category}</span>}
          {post.author && <><span className="article-meta-dot">·</span><span>By {post.author}</span></>}
          {post.date && <><span className="article-meta-dot">·</span><span>{post.date}</span></>}
        </div>
        <h1 className="article-title">{post.title}</h1>

        {post.image && (
          <div className="article-hero">
            <img src={post.image} alt={post.title} />
          </div>
        )}

        <div className="article-body">
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
        </div>

        {post.tags?.length > 0 && (
          <div className="article-tags">
            {post.tags.map((t) => <span className="article-tag" key={t}>{t}</span>)}
          </div>
        )}

        <Link href="/journal" className="link-more" style={{ marginTop: 24 }}>
          <Icon name="ArrowRight" size={14} /> Back to all articles
        </Link>
      </article>
    </div>
  );
}
