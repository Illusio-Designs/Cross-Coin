import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Hero slider. Prop-driven: pass `slides` from the API.
   slide shape: { id, eyebrow, title, description, image, buttonText, buttonLink }
   Renders a skeleton while slides is empty. */

export default function HeroBanner({ slides = [] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) {
    return (
      <section className="relative overflow-hidden">
        <div className="h-[86vh] min-h-[560px] bg-gray-200 animate-pulse" />
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[86vh] md:h-[92vh] min-h-[580px]">
        {slides.map((s, i) => (
          <div
            key={s.id ?? i}
            aria-hidden={i !== current}
            className={`absolute inset-0 transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              i === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={s.image}
              alt={s.title || 'Gripzus'}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: i === current ? 'scale(1)' : 'scale(1.06)' }}
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-ink/80 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_20%)] pointer-events-none" />

            <div className="relative h-full">
              <div className="wrap h-full flex items-center">
                <div className="max-w-2xl py-20">
                  <div className="rounded-[2.5rem] border border-white/10 bg-ink/70 backdrop-blur-2xl p-10 md:p-12 shadow-[0_50px_120px_rgba(0,0,0,0.28)] max-w-2xl">
                    <h1 className="h-display text-paper leading-[0.88] tracking-[-0.05em] text-5xl md:text-[5.5rem] lg:text-[6rem]">
                      {s.title}
                    </h1>
                    {s.description && (
                      <p className="text-paper/80 text-base md:text-lg mt-6 max-w-3xl text-justify leading-8">
                        {s.description}
                      </p>
                    )}
                    <div className="mt-10 flex flex-wrap items-center gap-4">
                      <Link
                        href={s.buttonLink || '/products'}
                        className="inline-flex items-center justify-center rounded-full bg-paper px-10 py-4 text-ink font-semibold shadow-[0_25px_60px_rgba(0,0,0,0.18)] transition-transform duration-300 hover:-translate-y-1"
                      >
                        {s.buttonText || 'Shop the collection'}
                      </Link>
                      <span className="text-sm tracking-[0.24em] uppercase text-paper/70 hidden md:inline-flex">
                        premium selection curated for the season
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {slides.length > 1 && (
          <div className="absolute right-6 md:right-10 top-1/2 z-20 -translate-y-1/2 hidden md:flex flex-col items-center">
            <div className="flex flex-col items-center gap-5 py-5 px-4 bg-black/35 border border-white/10 rounded-full backdrop-blur-xl shadow-[0_35px_90px_rgba(0,0,0,0.24)]">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="flex items-center justify-center"
                >
                  <span
                    className={`block rounded-full transition-all duration-400 ${
                      i === current
                        ? 'w-4 h-14 bg-paper shadow-[0_0_25px_rgba(255,255,255,0.6)]' 
                        : 'w-3 h-3 bg-paper/50 hover:bg-paper/80'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
