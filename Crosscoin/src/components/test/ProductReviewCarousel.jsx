import { useEffect, useRef, useState } from 'react';

export default function ProductReviewCarousel({ reviews }) {
  const rail = useRef(null);
  const [paused, setPaused] = useState(false);
  const items = reviews.slice(0, 5);
  const move = (direction) => {
    const el = rail.current;
    if (!el) return;
    const cards = Array.from(el.children);
    const current = cards.reduce((best, card, i) => Math.abs(card.offsetLeft - el.offsetLeft - el.scrollLeft) < Math.abs(cards[best].offsetLeft - el.offsetLeft - el.scrollLeft) ? i : best, 0);
    const next = (current + direction + cards.length) % cards.length;
    el.scrollTo({ left: cards[next].offsetLeft - el.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  useEffect(() => {
    if (paused || items.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      if (!document.hidden && rail.current?.getBoundingClientRect().bottom > 0 && rail.current?.getBoundingClientRect().top < window.innerHeight) move(1);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused, items.length]);
  return (
    <div className="pdpreviews" role="region" aria-label="Customer reviews" aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}>
      {items.length > 1 && <button className="pdpreviews__arrow pdpreviews__prev" aria-label="Previous review" onClick={() => move(-1)}>←</button>}
      <div className="pdpreviews__rail" ref={rail}>
        {items.map((review, i) => (
          <article className="pdpreviews__card" key={i} aria-label={`Review ${i + 1} of ${items.length}`}>
            {review.image ? <img className="pdpreviews__photo" src={review.image} alt={`Photo shared by ${review.name}`} loading="lazy" /> : <div className="pdpreviews__avatar" aria-hidden="true">{review.name.trim().slice(0, 1).toUpperCase()}</div>}
            <div className="pdpreviews__body">
              <div className="pdpreviews__heading"><span className="pdpreviews__stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(Math.max(1, Math.min(5, Math.round(review.rating))))}</span><b>{review.name}</b>{review.verified && <span className="pdpreviews__verified" aria-label="Verified purchase">✓</span>}</div>
              <p>{review.text}</p>
            </div>
          </article>
        ))}
      </div>
      {items.length > 1 && <><button className="pdpreviews__arrow pdpreviews__next" aria-label="Next review" onClick={() => move(1)}>→</button><button className="pdpreviews__pause" onClick={() => setPaused(!paused)}>{paused ? 'Play reviews' : 'Pause reviews'}</button></>}
      <style jsx>{`
        .pdpreviews, .pdpreviews * { box-sizing: border-box; }
        .pdpreviews { position: relative; padding: 4px 0 30px; }
        .pdpreviews__rail { position: relative; display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding: 0 5px 8px 0; }
        .pdpreviews__rail::-webkit-scrollbar { display: none; }
        .pdpreviews__card { flex: 0 0 92%; min-width: 0; display: flex; align-items: flex-start; gap: 20px; padding: 24px; scroll-snap-align: start; background: var(--surface); border: 2px solid var(--ink); border-radius: 6px; box-shadow: 4px 4px 0 var(--ink); color: var(--ink); }
        .pdpreviews__photo,.pdpreviews__avatar { width: 112px; height: 112px; flex-shrink: 0; object-fit: cover; border-radius: 4px; background: var(--paper-2); }
        .pdpreviews__avatar { display: grid; place-items: center; font-size: 36px; font-weight: 700; color: var(--crimson); }
        .pdpreviews__body { min-width: 0; }
        .pdpreviews__heading { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .pdpreviews__stars { color: var(--crimson); font-size: 24px; letter-spacing: 2px; }
        .pdpreviews__verified { background: var(--ink); color: var(--surface); border-radius: 50%; width: 22px; height: 22px; text-align: center; }
        .pdpreviews__body p { margin: 10px 0 0; line-height: 1.65; overflow-wrap: anywhere; }
        .pdpreviews__arrow { position: absolute; z-index: 1; top: 65px; border: 2px solid var(--ink); background: var(--surface); color: var(--ink); width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 24px; }
        .pdpreviews__prev { left: 0; } .pdpreviews__next { right: 0; }
        .pdpreviews__pause { float: right; margin-top: 8px; background: none; border: 0; color: var(--ink-soft); text-decoration: underline; font-size: 12px; cursor: pointer; }
        @media(max-width: 600px) { .pdpreviews__card { padding: 18px; gap: 12px; flex-basis: 94%; } .pdpreviews__photo,.pdpreviews__avatar { width: 64px; height: 80px; } .pdpreviews__stars { font-size: 18px; } .pdpreviews__body p { font-size: 14px; } }
      `}</style>
    </div>
  );
}
