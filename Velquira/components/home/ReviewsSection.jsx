import Icon from '@/components/Icon';

export default function ReviewsSection({ reviews = [] }) {
  const rated = reviews.filter((r) => Number(r.rating) > 0);
  const avg = rated.length ? (rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length) : 0;
  const total = reviews.length;

  return (
    <section className="section container">
      <div className="section-head">
        <div>
          <span className="eyebrow">Reviews</span>
          <h2 style={{ marginTop: 8 }}>In Their Words</h2>
        </div>
        <div className="reviews-badge">
          <b>{avg ? avg.toFixed(1) : '—'}</b>
          <span className="reviews-badge-stars">
            {[0, 1, 2, 3, 4].map((i) => (
              <Icon key={i} name="Star" size={13} color={i < Math.round(avg) ? 'var(--star)' : '#dce2e6'} />
            ))}
          </span>
          <small>{total} review{total === 1 ? '' : 's'}</small>
        </div>
      </div>

      {reviews.length === 0 && (
        <div className="empty" style={{ marginTop: 8 }}>No reviews yet — your feedback will appear here.</div>
      )}

      <div className="review-grid">
        {reviews.slice(0, 6).map((r, i) => (
          <div className="review" key={i}>
            <div className="review-stars" style={{ marginBottom: 10 }}>
              {[0, 1, 2, 3, 4].map((n) => (
                <Icon key={n} name="Star" size={13} color={n < r.rating ? 'var(--star)' : '#dce2e6'} />
              ))}
            </div>
            {r.title && <b className="review-title">{r.title}</b>}
            <p>{r.text}</p>
            <div className="review-head" style={{ marginTop: 14, marginBottom: 0 }}>
              <div className="review-av">{(r.author || '?').charAt(0)}</div>
              <div><b style={{ fontSize: 13 }}>{r.author}</b><span className="muted" style={{ fontSize: 12 }}>{r.date}</span></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
