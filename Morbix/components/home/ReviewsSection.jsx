import Icon from '@/components/Icon';

export default function ReviewsSection({ reviews = [] }) {
  return (
    <section className="section container">
      <div className="section-head">
        <div>
          <span className="eyebrow">Reviews</span>
          <h2 style={{ marginTop: 8 }}>What our customers say</h2>
        </div>
        <div className="reviews-badge">
          <b>4.8</b>
          <span className="reviews-badge-stars">
            {[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="Star" size={13} color="var(--star)" />)}
          </span>
          <small>2,000+ reviews</small>
        </div>
      </div>

      <div className="review-grid">
        {reviews.slice(0, 3).map((r, i) => (
          <div className="review" key={i}>
            <div className="review-stars" style={{ marginBottom: 10 }}>
              {[0, 1, 2, 3, 4].map((n) => (
                <Icon key={n} name="Star" size={13} color={n < r.rating ? 'var(--star)' : '#dce2e6'} />
              ))}
            </div>
            <b className="review-title">{r.title}</b>
            <p>{r.text}</p>
            <div className="review-head" style={{ marginTop: 14, marginBottom: 0 }}>
              <div className="review-av">{r.author.charAt(0)}</div>
              <div><b style={{ fontSize: 13 }}>{r.author}</b><span className="muted" style={{ fontSize: 12 }}>{r.date}</span></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
