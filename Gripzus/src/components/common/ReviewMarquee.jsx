/* Shared review marquee — one minimal design used on BOTH the home page
   (ReviewBand) and the PDP (ProductTestimonials). Two rows scroll in opposite
   directions, pause on hover, edges masked. Monochrome hairline cards, no boxes. */

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
    <figure className="shrink-0 w-[280px] md:w-[340px] px-6 mx-2 border-l border-line">
      <Stars n={r.rating} />
      <blockquote className="text-ink text-[14px] leading-relaxed mt-3.5 mb-4">“{r.quote}”</blockquote>
      <figcaption className="flex items-baseline gap-2">
        <span className="text-[13px] text-ink">{r.name}</span>
        {r.role && <span className="eyebrow text-ink-muted">{r.role}</span>}
      </figcaption>
    </figure>
  );
}

export default function ReviewMarquee({ reviews = [] }) {
  if (!reviews.length) return null;

  // Split into two rows; duplicate each for a seamless loop.
  const half = Math.ceil(reviews.length / 2);
  const rowA = reviews.slice(0, half);
  const rowB = reviews.slice(half).length ? reviews.slice(half) : rowA;

  return (
    <>
      <div className="gz-marquee">
        <div className="gz-track gz-track--left">
          {[...rowA, ...rowA].map((r, i) => <ReviewCard key={`a-${r.id}-${i}`} r={r} />)}
        </div>
      </div>
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
        .gz-track { display: flex; width: max-content; will-change: transform; }
        .gz-track--left  { animation: gz-scroll-left 46s linear infinite; }
        .gz-track--right { animation: gz-scroll-right 46s linear infinite; }
        .gz-marquee:hover .gz-track { animation-play-state: paused; }
        @keyframes gz-scroll-left  { from { transform: translateX(0); }    to { transform: translateX(-50%); } }
        @keyframes gz-scroll-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        @media (max-width: 768px) { .gz-track--left, .gz-track--right { animation-duration: 32s; } }
        @media (prefers-reduced-motion: reduce) { .gz-track--left, .gz-track--right { animation: none; } }
      `}</style>
    </>
  );
}
