/* Shared reviews — one minimal design used on BOTH the home page (ReviewBand)
   and the PDP (ProductTestimonials). A clean hairline-bordered grid of review
   cards — monochrome, architectural, no marquee. */

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

export default function ReviewMarquee({ reviews = [], max = 6 }) {
  if (!reviews.length) return null;
  const list = reviews.slice(0, max);

  return (
    <div className="wrap">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-line">
        {list.map((r, i) => (
          <figure key={r.id ?? i} className="border-b border-r border-line p-6 md:p-8">
            <Stars n={r.rating} />
            <blockquote className="text-ink text-[14px] md:text-[15px] leading-relaxed mt-4 mb-5">“{r.quote}”</blockquote>
            <figcaption className="flex items-baseline gap-2">
              <span className="text-[13px] text-ink">{r.name}</span>
              {r.role && <span className="eyebrow text-ink-muted">{r.role}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
