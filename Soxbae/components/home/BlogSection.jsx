import Link from 'next/link';
import Icon from '@/components/Icon';

// Soxbae journal — a MAGAZINE layout (not Morbix's equal 3-col grid): one large
// lead article on the left, a slim stacked list of the next few on the right.
export default function BlogSection({ posts = [] }) {
  if (!posts.length) return null;
  const [lead, ...rest] = posts;
  const list = rest.slice(0, 3);

  return (
    <section className="section container sx-journal">
      <div className="section-head">
        <div>
          <span className="eyebrow">Journal</span>
          <h2>Stories &amp; guides</h2>
        </div>
        <Link href="/journal" className="link-more">All articles</Link>
      </div>

      <div className="sx-journal-grid">
        <Link href={`/journal/${lead.slug}`} className="sx-journal-lead">
          <div className="sx-journal-lead-media">
            {lead.image
              ? <img src={lead.image} alt={lead.title} loading="lazy" />
              : <span aria-hidden><Icon name="Sparkles" size={44} /></span>}
          </div>
          <div className="sx-journal-lead-body">
            <div className="sx-journal-meta"><span>{lead.category}</span><i>·</i><span>{lead.date}</span></div>
            <h3>{lead.title}</h3>
            <p>{lead.excerpt}</p>
            <span className="sx-journal-read">Read article <Icon name="ArrowRight" size={14} /></span>
          </div>
        </Link>

        {list.length > 0 && (
          <div className="sx-journal-list">
            {list.map((p) => (
              <Link href={`/journal/${p.slug}`} className="sx-journal-item" key={p.slug}>
                <div className="sx-journal-thumb">
                  {p.image
                    ? <img src={p.image} alt={p.title} loading="lazy" />
                    : <span aria-hidden><Icon name="Sparkles" size={22} /></span>}
                </div>
                <div className="sx-journal-item-body">
                  <div className="sx-journal-meta"><span>{p.category}</span><i>·</i><span>{p.date}</span></div>
                  <h4>{p.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
