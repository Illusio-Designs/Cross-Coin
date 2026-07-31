import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Gripzus hero — techwear spec-sheet.
   Full-bleed image inside a gently-radiused frame, engineering grid + corner
   ticks, monospace spec callouts, Space Grotesk headline, and a mono slide
   index. Structured like a product datasheet, not a fashion cover.
   slide shape: { id, eyebrow, title, description, image, buttonText, buttonLink } */

const SPECS = [
  ['GRIP', '360°'],
  ['FIT', 'LOCKED'],
  ['YARN', 'COMBED'],
];

export default function HeroBanner({ slides = [] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) {
    return (
      <section className="wrap pt-4">
        <div className="h-[82vh] min-h-[560px] rounded-lg bg-paper-deep animate-pulse" />
      </section>
    );
  }

  const s = slides[Math.min(current, slides.length - 1)];

  return (
    <section className="wrap pt-4 md:pt-6">
      {/* top datasheet strip */}
      <div className="flex items-center justify-between border-y border-ink py-2 mb-4">
        <span className="spec text-ink">GRIPZUS™ / GRIP SYSTEM</span>
        <span className="spec hidden sm:inline text-ink">ENGINEERED FOR MOVEMENT</span>
        <span className="spec text-ink">EST. 2026 · IN</span>
      </div>

      <div className="ticked relative overflow-hidden rounded-lg bg-ink">
        <div className="relative h-[80vh] md:h-[86vh] min-h-[560px]">
          {/* Stacked images (cross-fade) */}
          {slides.map((sl, i) => (
            <img
              key={sl.id ?? i}
              src={sl.image}
              alt={sl.title || 'Gripzus'}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${i === current ? 'opacity-100' : 'opacity-0'}`}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}

          {/* engineering grid + scrim */}
          <div className="absolute inset-0 grid-dot opacity-[0.12] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/55 to-transparent pointer-events-none" />

          {/* top-left index tag */}
          <div className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-3">
            <span className="spec text-paper/80 border border-paper/25 rounded px-2 py-1">MOD.{String(current + 1).padStart(2, '0')}</span>
            <span className="spec text-paper/50">/ {String(slides.length).padStart(2, '0')}</span>
          </div>

          {/* content */}
          <div className="absolute inset-0 flex items-end">
            <div className="w-full px-5 md:px-10 pb-8 md:pb-12">
              <span className="kicker kicker-light mb-4">{s.eyebrow || 'Socks · Engineered'}</span>
              <h1 className="h-mark text-paper mt-3 text-[13vw] leading-[0.92] sm:text-[9.5vw] md:text-[6rem] lg:text-[7rem] whitespace-pre-line">
                {s.title || 'Hold your\nground.'}
              </h1>

              {s.description && (
                <p className="text-paper/75 text-[14px] md:text-[15px] mt-5 max-w-md leading-7">{s.description}</p>
              )}

              {/* spec row */}
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-paper/20 pt-4 max-w-xl">
                {SPECS.map(([k, v]) => (
                  <div key={k} className="flex items-baseline gap-2">
                    <span className="spec text-paper/50">{k}</span>
                    <span className="font-mono text-paper text-sm font-bold">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={s.buttonLink || '/products'} className="btn-light">
                  {s.buttonText || 'Shop the system'}
                </Link>
                <Link href="/collections" className="btn-outline !border-paper/40 !text-paper hover:!bg-paper hover:!text-ink">
                  Collections
                </Link>
              </div>
            </div>
          </div>

          {/* slide selector — bottom-right, mono */}
          {slides.length > 1 && (
            <div className="absolute right-4 md:right-6 bottom-5 md:bottom-7 z-20 flex items-center gap-2">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                  className={`h-6 rounded transition-all duration-300 ${i === current ? 'w-8 bg-paper' : 'w-6 bg-paper/25 hover:bg-paper/50'}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
