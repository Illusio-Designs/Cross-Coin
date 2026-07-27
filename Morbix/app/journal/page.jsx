import Link from 'next/link';
import Icon from '@/components/Icon';
import { getBlogPosts } from '@/lib/api';

export const revalidate = 300;
export const metadata = { title: 'Journal' };

export default async function JournalPage() {
  const posts = await getBlogPosts();

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Journal</span>
        <h1>Stories &amp; guides</h1>
        <p>Notes on comfort, technology and life in motion.</p>
      </div>

      {posts.length === 0 ? (
        <div className="empty" style={{ marginTop: 20 }}>No articles yet — check back soon.</div>
      ) : (
        <div className="blog-grid" style={{ marginTop: 26 }}>
          {posts.map((p) => (
            <Link href={`/journal/${p.slug}`} className="blog-card" key={p.slug}>
              <div className="blog-media">
                {p.image
                  ? <img src={p.image} alt={p.title} loading="lazy" />
                  : <span aria-hidden><Icon name="Sparkles" size={40} /></span>}
              </div>
              <div className="blog-body">
                <div className="blog-meta"><span className="blog-cat">{p.category}</span>{p.date && <><span>·</span><span>{p.date}</span></>}</div>
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
                <span className="blog-read">Read article <Icon name="ArrowRight" size={13} /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
