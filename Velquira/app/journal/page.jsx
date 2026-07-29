import BlogCard from '@/components/home/BlogCard';
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
          {posts.map((p) => <BlogCard post={p} key={p.slug} />)}
        </div>
      )}
    </div>
  );
}
