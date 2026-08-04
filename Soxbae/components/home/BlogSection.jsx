import Link from 'next/link';
import BlogCard from '@/components/BlogCard';

// Soxbae journal strip on the home page — uses the shared BlogCard.
export default function BlogSection({ posts = [] }) {
  if (!posts.length) return null;
  const list = posts.slice(0, 3);

  return (
    <section className="section container sx-journal">
      <div className="section-head">
        <div>
          <span className="eyebrow">Journal</span>
          <h2>Notes &amp; know-how</h2>
        </div>
        <Link href="/journal" className="link-more">All articles</Link>
      </div>

      <div className="sx-jr-grid">
        {list.map((p) => <BlogCard key={p.slug} post={p} />)}
      </div>
    </section>
  );
}
