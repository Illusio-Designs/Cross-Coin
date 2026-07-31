import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Gripzus hero — premium & animated, cohesive with the floating header /
   rounded footer. An inset rounded image frame with a slow Ken-Burns zoom,
   a word-by-word headline reveal, pill CTAs, a numbered slide index and a
   scroll cue. slide: { id, eyebrow, title, description, image, buttonText, buttonLink } */

export default function HeroBanner({ slides = [] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) {
    return (
      <section className="wrap pt-3 md:pt-4">
        <div className="h-[84vh] min-h-[540px] rounded-[24px] md:rounded-[32px] bg-paper-deep animate-pulse" />
      </section>
    );
  }

  const s = slides[Math.min(current, slides.length - 1)];
  const words = (s.title || 'Hold your ground.').split(' ');

  return (
    <section className="wrap pt-3 md:pt-4">
      <div className="relative overflow-hidden rounded-[24px] md:rounded-[32px] bg-ink">
        <div className="relative h-[84vh] md:h-[90vh] min-h-[560px]">
          {/* Crossfading images with a slow zoom on the active one */}
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

          {/* Scrims */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/45 to-transparent pointer-events-none" />

          {/* Content */}
          <div className="absolute inset-0 flex items-end">
            <div className="w-full px-6 md:px-12 lg:px-16 pb-14 md:pb-16">
              <div key={current} className="max-w-3xl">
                <span className="inline-block text-paper/70 text-[11px] tracking-[0.24em] uppercase gz-fade" style={{ animationDelay: '.05s' }}>
                  {s.eyebrow || 'Gripzus — SS26'}
                </span>

                <h1 className="h-display text-paper mt-4 text-[12vw] leading-[1.0] sm:text-[8vw] md:text-6xl lg:text-[5.2rem]">
                  {words.map((w, i) => (
                    <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.25em]">
                      <span className="inline-block gz-word" style={{ animationDelay: `${0.12 + i * 0.08}s` }}>{w}</span>
                    </span>
                  ))}
                </h1>

                {s.description && (
                  <p className="text-paper/75 text-[13px] md:text-[15px] mt-5 max-w-md leading-7 gz-fade" style={{ animationDelay: `${0.14 + words.length * 0.08}s` }}>
                    {s.description}
                  </p>
                )}

                <div className="mt-8 flex flex-wrap items-center gap-3 gz-fade" style={{ animationDelay: `${0.22 + words.length * 0.08}s` }}>
                  <Link href={s.buttonLink || '/products'} className="inline-flex items-center gap-2 rounded-full bg-paper text-ink px-7 py-3.5 text-[11px] tracking-[0.12em] uppercase hover:opacity-85 transition-opacity">
                    {s.buttonText || 'Shop the edit'}
                    <span>→</span>
                  </Link>
                  <Link href="/collections" className="inline-flex items-center rounded-full border border-paper/40 text-paper px-7 py-3.5 text-[11px] tracking-[0.12em] uppercase hover:bg-paper hover:text-ink transition-colors">
                    Collections
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Slide index */}
          {slides.length > 1 && (
            <div className="absolute right-5 md:right-10 bottom-6 md:bottom-8 z-20 flex items-center gap-3">
              <div className="flex gap-1.5">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                    className={`h-[3px] rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-paper' : 'w-4 bg-paper/40 hover:bg-paper/70'}`} />
                ))}
              </div>
              <span className="text-paper/75 text-[10px] tracking-[0.14em] tabular-nums">
                {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Scroll cue */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-8 z-20 hidden md:flex flex-col items-center gap-2 pointer-events-none">
            <span className="text-paper/60 text-[9px] tracking-[0.24em] uppercase">Scroll</span>
            <span className="w-px h-8 bg-paper/30 overflow-hidden relative"><span className="gz-scroll absolute inset-x-0 top-0 h-3 bg-paper" /></span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .gz-kenburns { animation: gz-kb 7s ease-out both; }
        @keyframes gz-kb { from { transform: scale(1.08); } to { transform: scale(1); } }
        .gz-word { transform: translateY(110%); animation: gz-word .7s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes gz-word { to { transform: translateY(0); } }
        .gz-fade { opacity: 0; transform: translateY(10px); animation: gz-fade .7s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes gz-fade { to { opacity: 1; transform: none; } }
        .gz-scroll { animation: gz-scroll 1.8s ease-in-out infinite; }
        @keyframes gz-scroll { 0% { transform: translateY(-100%); } 100% { transform: translateY(400%); } }
        @media (prefers-reduced-motion: reduce) {
          .gz-kenburns, .gz-word, .gz-fade, .gz-scroll { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}
