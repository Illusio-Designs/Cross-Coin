import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Gripzus hero — a full-bleed image with the content overlaid bottom-left:
   an index kicker, an oversized word-reveal headline, a short line and the
   CTAs, over a soft scrim. Slider index + arrows top-right, progress bars
   bottom-right. Monochrome, square controls. All copy comes from the admin
   slider (title / eyebrow / description / button) — no invented data.
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
  const idx = String((current % total) + 1).padStart(2, '0');
  const words = (s.title || 'Hold your ground.').split(' ');

  return (
    <section className="relative w-full overflow-hidden bg-ink">
      <div className="relative h-[82vh] min-h-[540px] max-h-[840px] w-full">
        {/* Crossfading images */}
        {has ? slides.map((sl, i) => (
          <img key={sl.id ?? i} src={sl.image} alt={sl.title || 'Gripzus'} loading={i === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] ${i === current ? 'opacity-100' : 'opacity-0'}`} />
        )) : <div className="absolute inset-0 bg-paper-deep animate-pulse" />}

        {/* Scrim for legible overlay text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10 pointer-events-none" />

        {/* Top bar — brand tag + slider index / arrows */}
        <div className="absolute inset-x-0 top-0 z-10">
          <div className="wrap flex items-center justify-between gap-4 py-5">
            <span className="text-paper/80 text-[10px] tracking-[0.2em] uppercase">Gripzus — Grip Socks</span>
            {slides.length > 1 && (
              <div className="flex items-center gap-4">
                <span className="text-paper/70 text-[10px] tracking-[0.16em] tabular-nums">{idx} / {String(total).padStart(2, '0')}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => go(current - 1)} aria-label="Previous" className="w-8 h-8 flex items-center justify-center border border-paper/30 text-paper/80 hover:bg-paper hover:text-ink transition-colors text-lg leading-none">‹</button>
                  <button onClick={() => go(current + 1)} aria-label="Next" className="w-8 h-8 flex items-center justify-center border border-paper/30 text-paper/80 hover:bg-paper hover:text-ink transition-colors text-lg leading-none">›</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content — overlaid bottom-left */}
        <div className="absolute inset-0 flex items-end">
          <div className="wrap w-full pb-14 md:pb-20">
            <div key={current} className="max-w-2xl">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-paper text-[11px] tracking-[0.2em] uppercase tabular-nums">N°{idx}</span>
                <span className="h-px w-10 bg-paper/60" />
                <span className="text-paper/80 text-[10px] tracking-[0.2em] uppercase">{s.eyebrow || 'New season'}</span>
              </div>

              <h1 className="h-mark text-paper text-[13vw] leading-[0.9] sm:text-[9vw] lg:text-[5.8rem]">
                {words.map((w, i) => (
                  <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.2em]">
                    <span className="inline-block gz-word" style={{ animationDelay: `${0.05 + i * 0.07}s` }}>{w}</span>
                  </span>
                ))}
              </h1>

              {s.description && <p className="text-paper/85 text-[14px] md:text-[15px] mt-5 max-w-md leading-7">{s.description}</p>}

              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link href={s.buttonLink || '/products'} className="inline-flex items-center gap-2 bg-paper text-ink px-8 py-4 text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-paper-warm transition-colors">
                  {s.buttonText || 'Shop the range'} <span aria-hidden="true">→</span>
                </Link>
                <Link href="/collections" className="text-paper/90 text-[11px] font-medium tracking-[0.14em] uppercase border-b border-paper/50 pb-1 hover:border-paper transition-colors">View collections</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bars — bottom-right */}
        {slides.length > 1 && (
          <div className="absolute bottom-0 right-0 z-10">
            <div className="wrap flex justify-end pb-6">
              <div className="flex items-center gap-1.5">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                    className={`h-1.5 transition-all duration-300 ${i === current ? 'w-6 bg-paper' : 'w-1.5 bg-paper/40 hover:bg-paper/70'}`} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .gz-word { transform: translateY(110%); animation: gzw .7s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes gzw { to { transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .gz-word { animation: none; transform: none; } }
      `}</style>
    </section>
  );
}
