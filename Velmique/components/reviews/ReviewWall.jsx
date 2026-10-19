import { Star } from 'lucide-react';

/* ReviewWall — a moving "wall of reviews": the set is split into THREE rows that
   auto-scroll sideways in ALTERNATING directions (left → right → left) in a
   seamless infinite loop, pausing on hover/focus. Rows with only a few cards
   stay static, and people who prefer reduced motion get a plain swipeable strip
   instead (see the `vqrv-*` rules in app/globals.css).

   Behaviour mirrors the Soxbae reviews wall; the markup is Velmique's own —
   ivory cards, gold stars, serif headings, hairline borders. Real data only:
   with no reviews it renders nothing.

   Props:
   - reviews  : array of raw review objects from the reviews API
   - total    : exact brand/product review count from the API pagination
   - title    : section heading
   - eyebrow  : optional small label above the heading
*/

// The reviews API is shared across brands, so field names vary a little between
// records — read the name / body / date defensively (same mapping the rest of
// Velmique uses for reviews).
function reviewName(r) {
  return r.reviewerName || r.guestName || r.User?.name || r.name || 'Verified customer';
}
function reviewText(r) {
  return r.review || r.comment || r.text || '';
}
function reviewDate(s) {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function StarRow({ value = 0, size = 13 }) {
  return (
    <span className="flex gap-0.5" aria-label={`${Math.round(value)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(value) ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-[var(--border)]'}
        />
      ))}
    </span>
  );
}

function ReviewCard(r, key) {
  const name = reviewName(r);
  const text = reviewText(r);
  const date = reviewDate(r.createdAt || r.created_at || r.date);
  return (
    <article key={key} className="vqrv-card bg-white border border-[var(--border)] p-5 md:p-6 flex flex-col text-left">
      <div className="flex items-center justify-between gap-3 mb-3">
        <StarRow value={Number(r.rating || 0)} />
        {date && (
          <span className="text-[var(--ink-muted)] text-[10px] tracking-[0.2em] uppercase font-body shrink-0">
            {date}
          </span>
        )}
      </div>
      {r.title && (
        <h3 className="font-serif italic text-[var(--ink)] text-base leading-tight mb-1.5 line-clamp-1">
          {r.title}
        </h3>
      )}
      <p className="text-[var(--ink-soft)] text-sm font-body leading-[1.6] flex-1 overflow-hidden line-clamp-4">
        {text}
      </p>
      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] grid place-items-center font-serif italic text-[var(--gold-deep)] text-sm shrink-0">
          {(name || '?').charAt(0).toUpperCase()}
        </span>
        <span className="font-serif italic text-[var(--ink)] text-sm leading-none truncate">{name}</span>
      </div>
    </article>
  );
}

// One scrolling row. With fewer than `min` cards it stays a static strip (nothing
// to loop); otherwise the row is duplicated so the CSS marquee can loop
// seamlessly. `direction` flips the scroll side.
function Row({ items, direction = 'left' }) {
  if (!items.length) return null;
  const min = 4;
  if (items.length < min) {
    return (
      <div className="vqrv-static">
        {items.map((r, i) => ReviewCard(r, i))}
      </div>
    );
  }
  const seconds = Math.max(38, items.length * 6);
  return (
    <div
      className="vqrv-marquee"
      role="region"
      aria-label="Customer reviews"
      tabIndex={0}
      style={{ '--vqrv-dur': `${seconds}s` }}
    >
      <div className={`vqrv-track${direction === 'right' ? ' vqrv-rtl' : ''}`}>
        {items.map((r, i) => ReviewCard(r, i))}
        {items.map((r, i) => (
          <div className="vqrv-dup" aria-hidden="true" key={`dup-${i}`}>
            {ReviewCard(r, `d${i}`)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewWall({ reviews = [], total = 0, title = 'What our customers say', eyebrow }) {
  const list = (Array.isArray(reviews) ? reviews : []).filter((r) => reviewText(r).trim());
  if (!list.length) return null;

  // Average from the fetched sample; exact count from the API when supplied.
  const rated = list.filter((r) => Number(r.rating) > 0);
  const avg = rated.length ? rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length : 0;
  const count = Math.max(Number(total) || 0, list.length);

  // Split into three rows that scroll in alternating directions.
  const wall = list.slice(0, 30);
  const per = Math.ceil(wall.length / 3) || 1;
  const rows = [wall.slice(0, per), wall.slice(per, per * 2), wall.slice(per * 2)].filter((row) => row.length);
  const directions = ['left', 'right', 'left'];

  return (
    <div className="vqrv-wall">
      <div className="flex flex-col items-center text-center gap-3 mb-10 md:mb-14 px-5">
        {eyebrow && (
          <p className="text-[var(--gold-deep)] text-[9px] tracking-[0.25em] uppercase font-body">{eyebrow}</p>
        )}
        <h2 className="font-serif text-[var(--ink)] font-medium leading-[1.02]"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 5.1rem)' }}>
          {title}
        </h2>
        {avg > 0 && (
          <div className="flex items-center gap-2.5 mt-1">
            <StarRow value={avg} size={14} />
            <span className="text-[11px] tracking-[0.2em] uppercase font-body text-[var(--ink-soft)]">
              {avg.toFixed(1)}
              <span className="mx-2 text-[var(--gold)]" aria-hidden="true">·</span>
              {count.toLocaleString('en-IN')} review{count === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      <div className="vqrv-rows">
        {rows.map((row, idx) => (
          <Row key={idx} items={row} direction={directions[idx]} />
        ))}
      </div>
    </div>
  );
}
