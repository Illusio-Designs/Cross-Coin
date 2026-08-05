/* Customer reviews — home page. Uses the shared minimal ReviewMarquee so the
   design matches the PDP exactly. Pulls every approved review from the API on
   mount; renders nothing until real reviews exist (no placeholder data). */

import { useEffect, useState } from 'react';
import { getAllReviews } from '../../services/reviews';
import ReviewMarquee from '../common/ReviewMarquee';

export default function ReviewBand({ reviews: reviewsProp }) {
  const [reviews, setReviews] = useState(reviewsProp || []);

  useEffect(() => {
    if (reviewsProp) return; // parent supplied reviews — don't override
    let active = true;
    getAllReviews()
      .then((data) => { if (active && data && data.length) setReviews(data); })
      .catch(() => {});
    return () => { active = false; };
  }, [reviewsProp]);

  if (!reviews.length) return null;

  return (
    <section className="section-y border-y border-line overflow-hidden">
      <div className="wrap mb-10 md:mb-12">
        <p className="eyebrow text-ink-muted mb-3">Worn &amp; reviewed</p>
        <h2 className="h-display text-2xl md:text-4xl">Loved by thousands</h2>
      </div>
      <ReviewMarquee reviews={reviews} />
    </section>
  );
}
