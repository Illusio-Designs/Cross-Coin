import Link from 'next/link';
import Icon from '@/components/Icon';

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
        {posts.map((p) => (
          <Link href={`/journal/${p.slug}`} className="blog-card" key={p.slug}>
            <div className="blog-media">
              {p.image
                ? <img src={p.image} alt={p.title} loading="lazy" />
                : <span aria-hidden><Icon name="Sparkles" size={40} /></span>}
              {/* Lookbook overlay: meta + title + read laid over the image */}
              <div className="blog-cap">
                <div className="blog-meta"><span className="blog-cat">{p.category}</span><span>·</span><span>{p.date}</span></div>
                <h3>{p.title}</h3>
                <span className="blog-read">Read article <Icon name="ArrowRight" size={13} /></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
