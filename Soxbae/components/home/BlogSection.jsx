import Link from 'next/link';
import Icon from '@/components/Icon';

// Soxbae journal — an image-forward card grid: each post is a tall image with a
// category tag tucked over its lower edge, a serif title and a date underneath.
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
        {list.map((p) => (
          <Link href={`/journal/${p.slug}`} className="sx-jr-card" key={p.slug}>
            <div className="sx-jr-media">
              {p.image
                ? <img src={p.image} alt={p.title} loading="lazy" />
                : <span aria-hidden><Icon name="Sparkles" size={30} /></span>}
              {p.category && <span className="sx-jr-tag">{p.category}</span>}
            </div>
            <div className="sx-jr-body">
              <span className="sx-jr-date">{p.date}</span>
              <h3>{p.title}</h3>
              {p.excerpt && <p>{p.excerpt}</p>}
              <span className="sx-jr-more">Read article <Icon name="ArrowRight" size={14} /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
