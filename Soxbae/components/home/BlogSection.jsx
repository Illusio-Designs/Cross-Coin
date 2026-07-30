import Link from 'next/link';
import Icon from '@/components/Icon';

// Soxbae journal — an editorial "contents index": numbered rows with big serif
// titles, meta and a small thumbnail on the right, separated by hairline rules.
// Distinct from the equal-grid other brands use.
export default function BlogSection({ posts = [] }) {
  if (!posts.length) return null;
  const list = posts.slice(0, 4);

  return (
    <section className="section container sx-journal">
      <div className="section-head">
        <div>
          <span className="eyebrow">Journal</span>
          <h2>Notes &amp; know-how</h2>
        </div>
        <Link href="/journal" className="link-more">All articles</Link>
      </div>

      <div className="sx-jr-list">
        {list.map((p, i) => (
          <Link href={`/journal/${p.slug}`} className="sx-jr-row" key={p.slug}>
            <span className="sx-jr-num" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
            <div className="sx-jr-main">
              <div className="sx-jr-meta">
                <span>{p.category}</span><i>·</i><span>{p.date}</span>
              </div>
              <h3>{p.title}</h3>
              {p.excerpt && <p>{p.excerpt}</p>}
              <span className="sx-jr-read">Read article <Icon name="ArrowRight" size={14} /></span>
            </div>
            <div className="sx-jr-thumb">
              {p.image
                ? <img src={p.image} alt={p.title} loading="lazy" />
                : <span aria-hidden><Icon name="Sparkles" size={24} /></span>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
