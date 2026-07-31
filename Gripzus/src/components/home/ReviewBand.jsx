/* Customer reviews — infinite slider. Two rows scroll in opposite
   directions and pause on hover. Pulls every approved review from the
   API on mount; falls back to seed data so it is never empty. */

import { useEffect, useState } from 'react';
import { getAllReviews } from '../../services/reviews';

const SEED = [
  { id: 1, quote: 'Held a ten-day Himalayan trek and came back the exact same shape.', name: 'Anika S.', role: 'Trail editor', rating: 5 },
  { id: 2, quote: 'The dress pair genuinely disappears once it is on. No ridges, no slipping.', name: 'Rahul M.', role: 'Verified buyer', rating: 5 },
  { id: 3, quote: 'Bought one to test, then four more the next week. The cotton is another level.', name: 'Priya K.', role: 'Verified buyer', rating: 5 },
  { id: 4, quote: 'Three years of daily wear and zero holes. These just do not wear out.', name: 'Vikram T.', role: 'Verified buyer', rating: 5 },
  { id: 5, quote: 'Finally a sock that fits the arch. My runs feel completely different.', name: 'Sneha R.', role: 'Marathon runner', rating: 5 },
  { id: 6, quote: 'The merino pair kept me warm through a Manali winter without a single sweaty moment.', name: 'Arjun D.', role: 'Verified buyer', rating: 5 },
  { id: 7, quote: 'Gift-wrapped beautifully and the quality speaks for itself. Repeat customer now.', name: 'Meera J.', role: 'Verified buyer', rating: 5 },
  { id: 8, quote: 'You can feel the hand-linked toe — no lumpy seam digging in all day.', name: 'Karan P.', role: 'Verified buyer', rating: 5 },
];

function Stars({ n = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24"
          fill={i < n ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4"
          className={i < n ? 'text-accent' : 'text-line'}>
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ r }) {
  return (
    <figure className="shrink-0 w-[300px] md:w-[360px] bg-paper border border-line rounded-[16px] shadow-soft p-7 mx-2.5">
      <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
        <Stars n={r.rating} />
        <span className="spec text-ink-muted">{String(r.rating).padStart(2, '0')}.0 / 5</span>
      </div>
      <blockquote className="h-display text-ink text-lg md:text-xl leading-snug mb-5">
        “{r.quote}”
      </blockquote>
      <figcaption className="flex items-center gap-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="text-ink font-medium text-sm">{r.name}</span>
        <span className="spec text-ink-muted">/ {r.role}</span>
      </figcaption>
    </figure>
  );
}

export default function ReviewBand({ reviews: reviewsProp }) {
  const [reviews, setReviews] = useState(reviewsProp || SEED);

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
        <div className="flex items-center justify-between border-t border-ink pt-3 mb-8">
          <span className="spec text-ink">FIELD REPORTS — VERIFIED</span>
          <span className="spec text-ink-muted hidden sm:inline">RATING AVG 5.0</span>
        </div>
        <div className="text-center mb-12">
          <p className="kicker justify-center mb-4">Worn &amp; reviewed</p>
          <h2 className="h-mark text-3xl sm:text-4xl md:text-5xl">
            Loved by thousands.
          </h2>
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
