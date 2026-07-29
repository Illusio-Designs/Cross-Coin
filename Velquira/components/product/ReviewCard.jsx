import Icon from '@/components/Icon';

// One review card used by BOTH the home reviews section and the PDP reviews,
// so they look identical. Clean bordered card: gold stars, serif title, the
// quote, then a divider and the reviewer.
export default function ReviewCard({ review }) {
  const r = review || {};
  const rating = Math.round(Number(r.rating) || 0);
  return (
    <div className="review">
      <div className="review-stars">
        {[0, 1, 2, 3, 4].map((n) => (
          <Icon key={n} name="Star" size={13} color={n < rating ? 'var(--star)' : '#e2d3b4'} />
        ))}
      </div>
      {r.title && <b className="review-title">{r.title}</b>}
      <p>{r.text}</p>
      <div className="review-head">
        <div className="review-av">{(r.author || '?').charAt(0).toUpperCase()}</div>
        <div>
          <b>{r.author || 'Anonymous'}</b>
          {r.date && <span className="muted">{r.date}</span>}
        </div>
      </div>
    </div>
  );
}
