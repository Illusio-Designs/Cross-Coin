import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Hero slider. Prop-driven: pass `slides` from the API.
   slide shape: { id, eyebrow, title, description, image, buttonText, buttonLink }
   Renders a skeleton while slides is empty. */

export default function HeroBanner({ slides = [] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) {
    return (
      <section>
        <div className="h-[78vh] min-h-[520px] bg-gray-200 animate-pulse" />
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[82vh] md:h-[88vh] min-h-[540px] md:min-h-[660px]">
        {slides.map((s, i) => (
          <div
            key={s.id ?? i}
            aria-hidden={i !== current}
            className={`absolute inset-0 transition-opacity duration-[1000ms] ease-out ${i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <img src={s.image} alt={s.title || 'Gripzus'} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-transparent" />

            <div className="relative h-full flex items-end pb-16 md:pb-24">
              <div className="wrap">
                <div className="max-w-2xl">
                  {s.eyebrow && <p className="eyebrow text-paper/80 mb-4">{s.eyebrow}</p>}
                  <h1 className="h-display text-paper leading-[1.02]" style={{ fontSize: 'clamp(2.6rem, 6.5vw, 5.5rem)' }}>
                    {s.title}
                  </h1>
                  {s.description && (
                    <p className="text-paper/85 text-base md:text-lg mt-5 max-w-xl">{s.description}</p>
                  )}
                  <Link href={s.buttonLink || '/products'} className="btn-light mt-8 inline-flex">
                    {s.buttonText || 'Shop the collection'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Vertical dot rail — right edge, centered. Active dot stretches
            into a clay bar; the others are small ticks. */}
        {slides.length > 1 && (
          <div className="absolute right-5 md:right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="group flex items-center justify-center"
              >
                <span
                  className={`block w-[3px] rounded-full transition-all duration-500 ${
                    i === current ? 'h-10 bg-clay' : 'h-2.5 bg-paper/50 group-hover:bg-paper/90'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
