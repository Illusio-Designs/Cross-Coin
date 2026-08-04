/* Customer reviews — infinite slider. Two rows scroll in opposite
   directions and pause on hover. Pulls every approved review from the
   API on mount. Renders nothing until real reviews are available — no
   placeholder/seed data. */

import { useEffect, useState } from 'react';
import { getAllReviews } from '../../services/reviews';

function Stars({ n = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24"
          fill={i < n ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4"
          className={i < n ? 'text-ink' : 'text-line'}>
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ r }) {
  return (
    <figure className="shrink-0 w-[300px] md:w-[360px] px-7 mx-2.5 border-l border-line">
      <Stars n={r.rating} />
      <blockquote className="text-ink text-[15px] leading-relaxed mt-4 mb-5">
        “{r.quote}”
      </blockquote>
      <figcaption className="flex items-baseline gap-2">
        <span className="text-[13px] text-ink">{r.name}</span>
        <span className="eyebrow text-ink-muted">{r.role}</span>
      </figcaption>
    </figure>
  );
}

export default function ReviewBand({ reviews: reviewsProp }) {
  const [reviews, setReviews] = useState(reviewsProp || []);

  useEffect(() => {
    if (reviewsProp) return; // parent supplied reviews — don't override
    let active = true;
    getAllReviews()
      .then((data) => {
        if (active && data && data.length) setReviews(data);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [reviewsProp]);

  if (!reviews.length) return null;

  // Split into two rows; duplicate each row for a seamless loop.
  const half = Math.ceil(reviews.length / 2);
  const rowA = reviews.slice(0, half);
  const rowB = reviews.slice(half).length ? reviews.slice(half) : rowA;

  return (
    <section className="section-y border-y border-line overflow-hidden">
      <div className="wrap">
        <div className="mb-12">
          <p className="eyebrow text-ink-muted mb-3">Worn &amp; reviewed</p>
          <h2 className="h-display text-2xl md:text-3xl">Loved by thousands</h2>
        </div>
      </div>

      {/* Row 1 — scrolls left */}
      <div className="gz-marquee">
        <div className="gz-track gz-track--left">
          {[...rowA, ...rowA].map((r, i) => <ReviewCard key={`a-${r.id}-${i}`} r={r} />)}
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div className="gz-marquee mt-5">
        <div className="gz-track gz-track--right">
          {[...rowB, ...rowB].map((r, i) => <ReviewCard key={`b-${r.id}-${i}`} r={r} />)}
        </div>
      </div>

      <style jsx>{`
        .gz-marquee {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent);
          mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent);
        }
        .gz-track {
          display: flex;
          width: max-content;
          will-change: transform;
        }
        .gz-track--left  { animation: gz-scroll-left 46s linear infinite; }
        .gz-track--right { animation: gz-scroll-right 46s linear infinite; }
        .gz-marquee:hover .gz-track { animation-play-state: paused; }
        @keyframes gz-scroll-left  { from { transform: translateX(0); }    to { transform: translateX(-50%); } }
        @keyframes gz-scroll-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        @media (max-width: 768px) {
          .gz-track--left, .gz-track--right { animation-duration: 32s; }
        }
      `}</style>
    </section>
  );
}
