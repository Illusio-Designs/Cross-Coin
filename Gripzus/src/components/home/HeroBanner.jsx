import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Gripzus hero — soft luxe editorial.
   Full-bleed image, gentle warm scrim, elegant Fraunces serif headline
   set low-left, a slim rounded slide index bottom-right.
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
      <section className="wrap pt-6">
        <div className="h-[80vh] min-h-[540px] rounded-[28px] bg-paper-deep animate-pulse" />
      </section>
    );
  }

  const s = slides[Math.min(current, slides.length - 1)];

  return (
    <section className="wrap pt-4 md:pt-6">
      <div className="relative overflow-hidden rounded-[24px] md:rounded-[32px] bg-ink">
        <div className="relative h-[82vh] md:h-[88vh] min-h-[560px]">
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

          {/* Soft warm scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/40 to-transparent pointer-events-none" />

          {/* Content */}
          <div className="absolute inset-0 flex items-end">
            <div className="w-full px-6 md:px-12 lg:px-16 pb-12 md:pb-16">
              <div className="max-w-3xl">
                <span className="kicker kicker-light mb-5">{s.eyebrow || 'Socks, engineered'}</span>
                <h1 className="h-display text-paper mt-4 text-[13vw] leading-[0.98] sm:text-[10vw] md:text-[5.5rem] lg:text-[6.5rem]">
                  {s.title || 'Hold your\nground.'}
                </h1>
                {s.description && (
                  <p className="text-paper/75 text-[15px] md:text-base mt-6 max-w-lg leading-8">
                    {s.description}
                  </p>
                )}
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href={s.buttonLink || '/products'} className="btn-light">
                    {s.buttonText || 'Shop the collection'}
                  </Link>
                  <Link href="/collections" className="group inline-flex items-center gap-2 text-paper/85 text-xs uppercase tracking-[0.2em] hover:text-paper transition-colors">
                    New arrivals
                    <span className="w-7 h-px bg-paper/50 group-hover:w-11 transition-all duration-300" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Numbered slide index, bottom-right */}
          {slides.length > 1 && (
            <div className="absolute right-5 md:right-10 bottom-12 md:bottom-16 z-20 flex items-center gap-4">
              <div className="flex flex-col gap-2">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                    className={`h-[3px] rounded-full transition-all duration-300 ${i === current ? 'w-10 bg-paper' : 'w-5 bg-paper/40 hover:bg-paper/70'}`} />
                ))}
              </div>
              <span className="text-paper/70 text-xs tracking-[0.18em] tabular-nums">
                {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
