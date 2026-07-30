import BlogCard from '@/components/BlogCard';
import { getBlogPosts } from '@/lib/api';

export const revalidate = 300;
export const metadata = { title: 'Journal' };

export default async function JournalPage() {
  const posts = await getBlogPosts();

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Journal</span>
        <h1>Notes &amp; know-how</h1>
        <p>Guides on sizing, care and life in motion — everything to get the most from your socks.</p>
      </div>

      {posts.length === 0 ? (
        <div className="empty" style={{ marginTop: 20 }}>No articles yet — check back soon.</div>
      ) : (
        <div className="sx-jr-grid" style={{ marginTop: 26 }}>
          {posts.map((p) => <BlogCard key={p.slug} post={p} />)}
        </div>
      )}
    </div>
  );
}
