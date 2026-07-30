import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Gripzus hero — a clean, confident monochrome cover.
   Full-bleed image, a soft ink scrim, and a bold uppercase wordmark-style
   headline set low-left. Minimal numbered slide index on the right.
   slide shape: { id, eyebrow, title, description, image, buttonText, buttonLink } */

export default function HeroBanner({ slides = [] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) {
    return (
      <section className="relative overflow-hidden">
        <div className="h-[88vh] min-h-[560px] bg-paper-deep animate-pulse" />
      </section>
    );
  }

  const s = slides[Math.min(current, slides.length - 1)];

  return (
    <section className="relative overflow-hidden bg-ink">
      <div className="relative h-[88vh] md:h-[92vh] min-h-[580px]">
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

        {/* Scrim — heavier at the bottom-left where the type sits */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/45 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="wrap w-full pb-14 md:pb-20">
            <div className="max-w-4xl">
              <span className="eyebrow !text-paper/60">{s.eyebrow || 'Gripzus — Socks, Engineered'}</span>
              <h1 className="h-mark text-paper mt-5 text-[16vw] leading-[0.82] sm:text-[13vw] md:text-[8.5rem] lg:text-[10rem]">
                {s.title || 'Hold the\nfoot.'}
              </h1>
              {s.description && (
                <p className="text-paper/75 text-[15px] md:text-base mt-6 max-w-xl leading-8">
                  {s.description}
                </p>
              )}
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Link href={s.buttonLink || '/products'} className="btn-light">
                  {s.buttonText || 'Shop the collection'}
                </Link>
                <Link href="/collections" className="group inline-flex items-center gap-2 text-paper/80 text-xs uppercase tracking-[0.22em] hover:text-paper transition-colors">
                  New arrivals
                  <span className="w-8 h-px bg-paper/50 group-hover:w-12 transition-all duration-300" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Numbered slide index, bottom-right */}
        {slides.length > 1 && (
          <div className="absolute right-5 md:right-10 bottom-14 md:bottom-20 z-20 flex items-center gap-4">
            <div className="flex flex-col gap-2">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                  className={`h-px transition-all duration-300 ${i === current ? 'w-10 bg-paper' : 'w-5 bg-paper/40 hover:bg-paper/70'}`} />
              ))}
            </div>
            <span className="text-paper/70 text-xs tracking-[0.2em] tabular-nums">
              {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
