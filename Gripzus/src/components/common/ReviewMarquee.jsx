/* Shared reviews — one minimal design used on BOTH the home page (ReviewBand)
   and the PDP (ProductTestimonials). Proper hairline boxes; a static grid when
   they all fit, and an infinite horizontal auto-scroll when there are more than
   fit (mobile: >1, desktop: >3). */

import { useState, useEffect } from 'react';

function Stars({ n = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24"
          fill={i < n ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4"
          className={i < n ? 'text-ink' : 'text-line'}>
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}

function Card({ r }) {
  return (
    <figure className="h-full border border-line bg-paper p-6 md:p-7">
      <Stars n={r.rating} />
      <blockquote className="text-ink text-[14px] md:text-[15px] leading-relaxed mt-4 mb-5">“{r.quote}”</blockquote>
      <figcaption className="flex items-baseline gap-2">
        <span className="text-[13px] text-ink">{r.name}</span>
        {r.role && <span className="eyebrow text-ink-muted">{r.role}</span>}
      </figcaption>
    </figure>
  );
}

export default function ReviewMarquee({ reviews = [], max = 12 }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const u = () => setIsMobile(mq.matches);
    u();
    mq.addEventListener ? mq.addEventListener('change', u) : mq.addListener(u);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', u) : mq.removeListener(u); };
  }, []);

  if (!reviews.length) return null;
  const list = reviews.slice(0, max);
  const perView = isMobile ? 1 : 3;
  const scroll = list.length > perView;

  // Few enough to fit → static grid of proper boxes.
  if (!scroll) {
    return (
      <div className="wrap">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {list.map((r, i) => <Card key={r.id ?? i} r={r} />)}
        </div>
      </div>
    );
  }

  // More than fit → infinite auto-scroll (duplicate for a seamless loop).
  const loop = [...list, ...list];
  return (
    <div className="wrap">
      <div className="gz-rev-vp overflow-hidden">
        <div className="gz-rev-track flex gap-4 md:gap-5">
          {loop.map((r, i) => (
            <div key={i} className="w-[280px] sm:w-[320px] shrink-0"><Card r={r} /></div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .gz-rev-track { width: max-content; will-change: transform; animation: gz-rev 42s linear infinite; }
        .gz-rev-vp:hover .gz-rev-track { animation-play-state: paused; }
        @keyframes gz-rev { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (max-width: 640px) { .gz-rev-track { animation-duration: 26s; } }
        @media (prefers-reduced-motion: reduce) { .gz-rev-track { animation: none; } }
      `}</style>
    </div>
  );
}
