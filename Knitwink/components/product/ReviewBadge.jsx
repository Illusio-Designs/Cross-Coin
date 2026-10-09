import './review-badge.css'

/* Review badge on product cards: star, average rating and review count. Shows nothing
   until the product has a rating. From 1,000 reviews the count is compacted (1.2K) so it
   stays small on the photo; the full number is in the tooltip and the screen-reader label. */
export default function ReviewBadge({ rating, count, style }) {
  const r = Number(rating) || 0;
  const n = Number(count) || 0;
  if (!(r > 0)) return null;
  const compact = n >= 1000 ? `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '')}K` : String(n);
  const label = `${r.toFixed(1)} out of 5${n ? ` from ${n.toLocaleString('en-IN')} reviews` : ''}`;
  return (
    <span className="rvb" style={style} title={label} aria-label={label}>
      <span className="rvb-st" aria-hidden="true">★</span>
      <span className="rvb-sc">{r.toFixed(1)}</span>
      {n > 0 && <span className="rvb-ct">{compact}</span>}
    </span>
  );
}
