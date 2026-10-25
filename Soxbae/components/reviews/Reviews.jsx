'use client';

import { useMemo } from 'react';
import Icon from '@/components/Icon';
import ReviewRow from '@/components/ui/ReviewRow';
import WriteReviewButton from '@/components/product/WriteReviewButton';

// ONE review section, shared by the home page and the PDP. Same layout in both:
// a header with the average + count, then a clean grid of review cards. The PDP
// passes `showWrite` (+ productId) to add the "Write a review" button + modal.
export default function Reviews({
  reviews = [],
  total: totalProp,
  title = 'What our customers say',
  productId,
  showWrite = false,
  limit,
}) {
  const list = Array.isArray(reviews) ? reviews : [];
  const { avg, total } = useMemo(() => {
    const rated = list.filter((r) => Number(r.rating) > 0);
    // Exact total from the API when supplied (the list itself is only a page of them).
    const total = Math.max(Number(totalProp) || 0, list.length);
    const avg = rated.length ? rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length : 0;
    return { avg, total };
  }, [list, totalProp]);

  const shown = limit ? list.slice(0, limit) : list;

  // Split the sample into three rows that scroll in alternating directions
  // (left → right → left) for a moving "wall of reviews" look — same as Morbix.
  const wall = shown.slice(0, 30);
  const per = Math.ceil(wall.length / 3) || 1;
  const rows = [wall.slice(0, per), wall.slice(per, per * 2), wall.slice(per * 2)].filter((r) => r.length);
  const directions = ['left', 'right', 'left'];

  const ReviewCard = (r, i) => (
    <article className="sx-review" key={i}>
      <span className="sx-review-stars">
        {[0, 1, 2, 3, 4].map((n) => (
          <Icon key={n} name="Star" size={13} color={n < r.rating ? 'var(--accent)' : 'var(--line)'} />
        ))}
      </span>
      {r.title && <h3 className="sx-review-title">{r.title}</h3>}
      <p className="sx-review-text">{r.text}</p>
      {r.images?.length > 0 && <div className="review-customer-photos">{r.images.map((src, index) => <a key={`${src}-${index}`} href={src} target="_blank" rel="noopener noreferrer" aria-label={`Open review photo ${index + 1}`}><img src={src} alt={`Photo shared by ${r.author}`} width="72" height="72" loading="lazy" /></a>)}</div>}
      <div className="sx-review-by">
        <span className="sx-review-av">{(r.author || '?').charAt(0)}</span>
        <span><b>{r.author}</b>{r.date && <em>{r.date}</em>}</span>
      </div>
    </article>
  );

  return (
    <section className="section container sx-reviews" id="reviews">
      <div className="sx-reviews-head">
        <div>
          <span className="eyebrow">Reviews</span>
          <h2>{title}</h2>
        </div>
        <div className="sx-reviews-right">
          <div className="sx-reviews-score">
            <b>{total ? avg.toFixed(1) : '—'}</b>
            <span className="sx-reviews-stars">
              {[0, 1, 2, 3, 4].map((i) => (
                <Icon key={i} name="Star" size={14} color={i < Math.round(avg) ? 'var(--accent)' : 'var(--line)'} />
              ))}
            </span>
            <small>{total.toLocaleString('en-IN')} review{total === 1 ? '' : 's'}</small>
          </div>
          {showWrite && productId ? <WriteReviewButton productId={productId} /> : null}
        </div>
      </div>


      {shown.length === 0 ? (
        <div className="empty">No reviews yet — {showWrite ? 'be the first to review this product.' : 'your feedback will appear here.'}</div>
      ) : (
        <div className="sxrv-rows">
          {rows.map((row, idx) => (
            <ReviewRow
              key={idx}
              items={row}
              staticClassName="sx-reviews-grid"
              min={4}
              secPerItem={2.5}
              minDur={18}
              direction={directions[idx]}
              render={ReviewCard}
            />
          ))}
        </div>
      )}

    </section>
  );
}
