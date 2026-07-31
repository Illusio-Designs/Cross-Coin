import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Gripzus hero — full-bleed, starts BEHIND the fixed header. Distinct from
   the sibling brands: a slow Ken-Burns image, a word-by-word headline reveal
   low-left, and a floating glass control pill (prev / index / next / shop)
   docked bottom-right — echoing the header + footer pill language.
   slide: { id, eyebrow, title, description, image, buttonText, buttonLink } */

export default function HeroBanner({ slides = [] }) {
  const [current, setCurrent] = useState(0);
  const go = (n) => setCurrent((c) => (n + slides.length) % slides.length);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) {
    return <section className="-mt-[76px] md:-mt-[84px] h-[94vh] min-h-[600px] bg-paper-deep animate-pulse" />;
  }

  const s = slides[Math.min(current, slides.length - 1)];
  const words = (s.title || 'Hold your ground.').split(' ');

  return (
    <section className="relative -mt-[76px] md:-mt-[84px] bg-ink overflow-hidden">
      <div className="relative h-[94vh] min-h-[620px]">
        {/* Crossfading images with a slow zoom */}
        {slides.map((sl, i) => (
          <img
            key={sl.id ?? i}
            src={sl.image}
            alt={sl.title || 'Gripzus'}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              i === current ? 'opacity-100 gz-kenburns' : 'opacity-0'
            }`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}

        {/* Scrims — top so the header reads, bottom for the type */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent pointer-events-none" />

        {/* Headline — low-left */}
        <div className="absolute inset-0 flex items-end">
          <div className="w-full px-6 md:px-12 lg:px-16 pb-28 md:pb-32">
            <div key={current} className="max-w-3xl">
              <span className="inline-block text-paper/70 text-[11px] tracking-[0.26em] uppercase gz-fade" style={{ animationDelay: '.05s' }}>
                {s.eyebrow || 'Gripzus — SS26'}
              </span>
              <h1 className="h-display text-paper mt-4 text-[12vw] leading-[1.0] sm:text-[8vw] md:text-6xl lg:text-[5.4rem]">
                {words.map((w, i) => (
                  <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.25em]">
                    <span className="inline-block gz-word" style={{ animationDelay: `${0.12 + i * 0.08}s` }}>{w}</span>
                  </span>
                ))}
              </h1>
              {s.description && (
                <p className="text-paper/75 text-[13px] md:text-[15px] mt-5 max-w-md leading-7 gz-fade" style={{ animationDelay: `${0.16 + words.length * 0.08}s` }}>
                  {s.description}
                </p>
              )}
              {/* Left-side CTA */}
              <div className="mt-7 gz-fade" style={{ animationDelay: `${0.22 + words.length * 0.08}s` }}>
                <Link href={s.buttonLink || '/products'} className="inline-flex items-center gap-2 rounded-full bg-paper text-ink px-7 py-3.5 text-[11px] tracking-[0.12em] uppercase hover:opacity-85 transition-opacity">
                  {s.buttonText || 'Order now'} <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Floating glass nav pill — bottom-right */}
        {slides.length > 1 && (
          <div className="absolute left-6 right-6 md:left-12 md:right-12 lg:left-16 lg:right-16 bottom-6 md:bottom-8 z-20 flex justify-between items-center gap-4">
            <span className="hidden sm:block text-paper/70 text-[10px] tracking-[0.16em] tabular-nums">
              {String(current + 1).padStart(2, '0')} — {String(slides.length).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1.5 rounded-full border border-paper/20 bg-ink/35 backdrop-blur-md p-1.5 ml-auto">
              <button onClick={() => go(current - 1)} aria-label="Previous" className="w-9 h-9 rounded-full flex items-center justify-center text-paper/80 hover:bg-paper/10 transition-colors">‹</button>
              <div className="hidden sm:flex items-center gap-1 px-1">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-paper' : 'w-1.5 bg-paper/40 hover:bg-paper/70'}`} />
                ))}
              </div>
              <button onClick={() => go(current + 1)} aria-label="Next" className="w-9 h-9 rounded-full flex items-center justify-center text-paper/80 hover:bg-paper/10 transition-colors">›</button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .gz-kenburns { animation: gz-kb 7s ease-out both; }
        @keyframes gz-kb { from { transform: scale(1.08); } to { transform: scale(1); } }
        .gz-word { transform: translateY(110%); animation: gz-word .7s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes gz-word { to { transform: translateY(0); } }
        .gz-fade { opacity: 0; transform: translateY(10px); animation: gz-fade .7s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes gz-fade { to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .gz-kenburns, .gz-word, .gz-fade { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}
