/* Trust strip — editorial gallery. A very quiet thin row of tiny uppercase
   labels on hairlines. Sits near the bottom of the home page.

   Every claim is FACTUAL: Made in India (knit & inspected pair-by-pair in Morbi,
   Gujarat), secure payments, free shipping (now on all orders), the 7-day
   returns policy (see /returns and the PDP), and Cash on Delivery (offered at
   checkout). The optional rating line reuses the real store-wide review total
   (same /api/reviews/all source as the home ReviewBand) and renders only when
   real reviews exist — never a fabricated number. */

import { useEffect, useState } from 'react';
import { getAllReviewsWithTotal } from '../../services/reviews';

const ITEMS = [
  { title: 'Made in India',    note: 'Knit & inspected pair-by-pair in Morbi.' },
  { title: 'Secure checkout',  note: '100% secure payments, every time.' },
  { title: 'Free shipping',    note: 'On all orders, India-wide.' },
  { title: '7-day returns',    note: 'Not right? Send it back.' },
  { title: 'COD available',    note: 'Pay cash on delivery.' },
];

export default function TrustStrip({ rating: ratingProp = null }) {
  const [rating, setRating] = useState(ratingProp);

  useEffect(() => {
    if (ratingProp) return; // parent supplied the rating — don't refetch
    let active = true;
    getAllReviewsWithTotal()
      .then(({ reviews, total }) => {
        const rated = (reviews || []).filter((r) => Number(r.rating) > 0);
        const avg = rated.length ? rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length : 0;
        if (active && avg > 0 && total > 0) setRating({ avg, total });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [ratingProp]);

  return (
    <section className="border-t border-line">
      <div className="wrap">
        {rating && (
          <p className="eyebrow text-ink text-center py-6 border-b border-line">
            <span className="text-ink">★ Rated {rating.avg.toFixed(1)}</span>{' '}
            by {rating.total.toLocaleString('en-IN')}+ happy shoppers
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-5">
          {ITEMS.map((it) => (
            <div
              key={it.title}
              className="py-8 md:py-10 px-1 border-b border-line md:border-b-0 md:border-l md:first:border-l-0 md:pl-6"
            >
              <p className="eyebrow text-ink mb-2">{it.title}</p>
              <p className="text-[12px] text-ink-soft leading-relaxed max-w-[200px]">{it.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
