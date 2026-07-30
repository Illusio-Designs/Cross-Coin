import Icon from '@/components/Icon';

// Soxbae reviews — an editorial layout (not Morbix's uniform 3-col card grid):
// one large featured pull-quote, then a slim rail of compact quotes beneath.
export default function ReviewsSection({ reviews = [] }) {
  const rated = reviews.filter((r) => Number(r.rating) > 0);
  const avg = rated.length ? (rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length) : 0;
  const total = reviews.length;
  const withText = reviews.filter((r) => (r.text || '').trim());
  const lead = withText[0] || reviews[0];
  const rest = (withText[0] ? withText.slice(1) : reviews.slice(1)).slice(0, 3);

  return (
    <section className="section container sx-rev">
      <div className="sx-rev-head">
        <div>
          <span className="eyebrow">Happy feet</span>
          <h2>What our customers say</h2>
        </div>
        <div className="sx-rev-score">
          <b>{avg ? avg.toFixed(1) : '—'}</b>
          <span className="sx-rev-stars">
            {[0, 1, 2, 3, 4].map((i) => (
              <Icon key={i} name="Star" size={14} color={i < Math.round(avg) ? 'var(--accent)' : 'var(--line)'} />
            ))}
          </span>
          <small>{total} review{total === 1 ? '' : 's'}</small>
        </div>
      </div>

      {reviews.length === 0 && (
        <div className="empty" style={{ marginTop: 8 }}>No reviews yet — your feedback will appear here.</div>
      )}

      {lead && (
        <figure className="sx-rev-lead">
          <span className="sx-rev-mark" aria-hidden>“</span>
          <blockquote>{lead.text || lead.title}</blockquote>
          <figcaption>
            <span className="sx-rev-av">{(lead.author || '?').charAt(0)}</span>
            <span><b>{lead.author}</b><em>{lead.date}</em></span>
          </figcaption>
        </figure>
      )}

      {rest.length > 0 && (
        <div className="sx-rev-row">
          {rest.map((r, i) => (
            <div className="sx-rev-mini" key={i}>
              <span className="sx-rev-mini-stars">
                {[0, 1, 2, 3, 4].map((n) => (
                  <Icon key={n} name="Star" size={12} color={n < r.rating ? 'var(--accent)' : 'var(--line)'} />
                ))}
              </span>
              {r.title && <b>{r.title}</b>}
              <p>{r.text}</p>
              <span className="sx-rev-by">{r.author}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
