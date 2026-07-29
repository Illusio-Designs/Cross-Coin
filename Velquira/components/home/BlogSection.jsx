import Link from 'next/link';
import Icon from '@/components/Icon';
import BlogCard from './BlogCard';

export default function BlogSection({ posts = [] }) {
  return (
    <section className="section container">
      <div className="section-head">
        <div>
          <span className="eyebrow">Journal</span>
          <h2 style={{ marginTop: 8 }}>Stories &amp; Guides</h2>
        </div>
        <Link href="/journal" className="link-more">All articles <Icon name="ArrowRight" size={14} /></Link>
      </div>

      <div className="blog-grid">
        {posts.map((p) => <BlogCard post={p} key={p.slug} />)}
      </div>
    </section>
  );
}
