import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Gripzus hero — athletic, high-contrast.
   Full-bleed image, heavy ink scrim, oversized uppercase headline set
   low-left, numbered slide index + a bottom stat strip.
   slide shape: { id, eyebrow, title, description, image, buttonText, buttonLink } */

const STATS = [
  { k: 'GRIP', v: '360°' },
  { k: 'SIZES', v: 'FREE' },
  { k: 'WORN BY', v: '10K+' },
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
      <section className="relative overflow-hidden">
        <div className="h-[90vh] min-h-[560px] bg-paper-deep animate-pulse" />
      </section>
    );
  }

  const s = slides[Math.min(current, slides.length - 1)];

  return (
    <section className="relative overflow-hidden bg-ink">
      <div className="relative h-[90vh] md:h-[94vh] min-h-[600px]">
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

        {/* Scrims — heavy bottom-left where type sits */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/60 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="wrap w-full pb-10 md:pb-14">
            <div className="max-w-5xl">
              <span className="kicker kicker-light mb-6">{s.eyebrow || 'Socks, Engineered'}</span>
              <h1 className="h-mark text-paper mt-2 text-[17vw] leading-[0.82] sm:text-[14vw] md:text-[9.5rem] lg:text-[11rem] whitespace-pre-line">
                {s.title || 'HOLD\nYOUR\nGROUND'}
              </h1>
              {s.description && (
                <p className="text-paper/75 text-[15px] md:text-base mt-6 max-w-xl leading-8">
                  {s.description}
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href={s.buttonLink || '/products'} className="btn-light group">
                  {s.buttonText || 'Shop the collection'}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
                <Link href="/collections" className="btn-outline !border-paper !text-paper hover:!bg-paper hover:!text-ink">
                  New arrivals
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Numbered slide index, bottom-right */}
        {slides.length > 1 && (
          <div className="absolute right-5 md:right-16 bottom-10 md:bottom-14 z-20 flex items-center gap-4">
            <div className="flex flex-col gap-2">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                  className={`h-[2px] transition-all duration-300 ${i === current ? 'w-12 bg-paper' : 'w-6 bg-paper/40 hover:bg-paper/70'}`} />
              ))}
            </div>
            <span className="text-paper/70 text-xs font-bold tracking-[0.2em] tabular-nums">
              {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Stat strip */}
      <div className="border-t-2 border-paper/15">
        <div className="wrap">
          <div className="grid grid-cols-3 divide-x divide-paper/15">
            {STATS.map((st) => (
              <div key={st.k} className="py-5 md:py-7 flex flex-col items-center text-center">
                <span className="font-display text-paper text-3xl md:text-5xl leading-none" style={{ fontWeight: 900 }}>{st.v}</span>
                <span className="text-paper/55 text-[10px] font-bold tracking-[0.28em] uppercase mt-2">{st.k}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
