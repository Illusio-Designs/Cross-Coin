import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Gripzus hero — "The Statement". An asymmetric editorial spread laid on the
   off-white page (NOT a full-bleed image slider): an index kicker + oversized
   Space Grotesk headline + CTA + hairline stat row on the left, a 1px-framed
   image tile that crossfades on the right, the whole band ruled top + bottom.
   Monochrome, architectural — a third archetype, distinct from the siblings.
   slide: { id, eyebrow, title, description, image, buttonText, buttonLink } */

export default function HeroBanner({ slides = [] }) {
  const [current, setCurrent] = useState(0);
  const has = slides.length > 0;
  const total = slides.length || 1;
  const go = (n) => setCurrent((c) => (n + total) % total);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  const s = has ? slides[Math.min(current, slides.length - 1)] : {};
  const title = s.title || 'Hold your ground.';
  const words = title.split(' ');
  const idx = String((current % total) + 1).padStart(2, '0');

  return (
    <section className="border-b border-line">
      {/* Top meta rule — coordinates-style labels */}
      <div className="wrap flex items-center justify-between gap-4 py-3 border-b border-line text-[10px] tracking-[0.2em] uppercase text-ink-muted">
        <span className="text-ink">Gripzus — Grip Socks</span>
        <span>Engineered in Morbi, IN</span>
      </div>

      <div className="wrap grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-9 pb-11 md:pt-14 md:pb-16 items-end">
        {/* Left — the statement */}
        <div className="lg:col-span-7 order-2 lg:order-1">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[11px] tracking-[0.2em] uppercase text-ink tabular-nums">N°{idx}</span>
            <span className="h-px w-10 bg-ink" />
            <span className="eyebrow text-ink-muted">{s.eyebrow || 'New season'}</span>
          </div>

          <h1 key={current} className="h-mark text-ink text-[13.5vw] leading-[0.9] sm:text-[9vw] lg:text-[6.4rem]">
            {words.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.2em]">
                <span className="inline-block gz-word" style={{ animationDelay: `${0.05 + i * 0.07}s` }}>{w}</span>
              </span>
            ))}
          </h1>

          {s.description && <p className="prose-body max-w-md mt-7 text-[14px]">{s.description}</p>}

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link href={s.buttonLink || '/products'} className="btn">
              {s.buttonText || 'Shop the range'} <span aria-hidden="true">→</span>
            </Link>
            <Link href="/collections" className="link-line">View collections</Link>
          </div>

          {/* Stat row — hairline separated, index/spec voice */}
          <div className="mt-11 grid grid-cols-3 border-t border-line max-w-xl">
            {[['200N', 'Grip force'], ['Hand-linked', 'Seamless toe'], ['500', 'Pairs / run']].map(([a, b], i) => (
              <div key={i} className={`py-5 ${i > 0 ? 'border-l border-line pl-5' : 'pr-5'}`}>
                <div className="h-display text-lg md:text-2xl text-ink leading-none">{a}</div>
                <div className="eyebrow text-ink-muted mt-2">{b}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — clean image (no frame/partition), slider controls on TOP */}
        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="relative aspect-[4/5] overflow-hidden bg-paper-warm">
            {has ? slides.map((sl, i) => (
              <img key={sl.id ?? i} src={sl.image} alt={sl.title || 'Gripzus'} loading={i === 0 ? 'eager' : 'lazy'}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)] ${i === current ? 'opacity-100' : 'opacity-0'}`} />
            )) : <div className="absolute inset-0 bg-paper-deep animate-pulse" />}

            {/* Scrim so the top controls stay legible on any image */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent pointer-events-none" />

            {/* Slider content on TOP: index + title left, prev/next right */}
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 py-3.5">
              <span className="text-paper text-[11px] tracking-[0.16em] uppercase tabular-nums truncate">
                {idx} / {String(total).padStart(2, '0')}{has && s.title ? ` · ${s.title}` : ''}
              </span>
              {slides.length > 1 && (
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => go(current - 1)} aria-label="Previous" className="text-paper/80 hover:text-paper transition-colors text-xl leading-none">‹</button>
                  <button onClick={() => go(current + 1)} aria-label="Next" className="text-paper/80 hover:text-paper transition-colors text-xl leading-none">›</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .gz-word { transform: translateY(110%); animation: gzw .7s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes gzw { to { transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .gz-word { animation: none; transform: none; } }
      `}</style>
    </section>
  );
}
