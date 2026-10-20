import { useState, useEffect } from 'react';
import Link from 'next/link';
import GzImage from '../common/GzImage';
import { Sk, SkBusy } from '../common/Skeleton';
import { ikw, ikSrcSet } from '../../utils/imagekit';

// Ask ImageKit for a sized, format-negotiated hero image instead of the
// full-resolution original (big LCP win on the largest image on the page).
// Width-only (whole picture, any existing tr= replaced). Desktop gets a
// 1200/1600/2000 srcSet at 100vw; a slide's mobile banner gets 800 (1200 @2x).
// Shared with the <link rel=preload> in pages/index.jsx so the hero is
// downloaded exactly once.
export const HERO_WIDTHS = [1200, 1600, 2000];
export const HERO_MOBILE_WIDTHS = [800, 1200];
export function heroSrc(src) { return ikw(src, 1600); }
export function heroSrcSet(src) { return ikSrcSet(src, HERO_WIDTHS); }
export function heroMobileSrc(src) { return ikw(src, 800); }
export function heroMobileSrcSet(src) { return ikSrcSet(src, HERO_MOBILE_WIDTHS); }

/* Gripzus hero — a full-bleed image with the content overlaid bottom-left:
   an index kicker, an oversized word-reveal headline, a short line and the
   CTAs, over a soft scrim. Slider index + arrows top-right, progress bars
   bottom-right. Monochrome, square controls. All copy comes from the admin
   slider (title / eyebrow / description / button) — no invented data.
   slide: { id, eyebrow, title, description, image, buttonText, buttonLink } */

export default function HeroBanner({ slides = [] }) {
  const [current, setCurrent] = useState(0);
  const [firstReady, setFirstReady] = useState(false);
  const has = slides.length > 0;
  const total = slides.length || 1;
  const go = (n) => setCurrent((c) => (n + total) % total);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  // Until the slider API responds, show a shimmer skeleton — never placeholder copy.
  if (!has) {
    return (
      <section className="relative w-full overflow-hidden bg-paper-warm">
        <SkBusy label="Loading banner…" className="relative aspect-[4/5] md:aspect-[16/9] w-full">
          <div className="absolute inset-0 flex items-end">
            <div className="wrap w-full pb-14 md:pb-20">
              <div className="max-w-2xl">
                <Sk className="h-3 w-40 mb-6" />
                <Sk className="h-14 md:h-[4.5rem] w-4/5 mb-4" />
                <Sk className="h-14 md:h-[4.5rem] w-3/5 mb-7" />
                <Sk className="h-4 w-64 mb-8" />
                <Sk className="h-12 w-48" />
              </div>
            </div>
          </div>
        </SkBusy>
      </section>
    );
  }

  const s = slides[Math.min(current, slides.length - 1)];
  const idx = String((current % total) + 1).padStart(2, '0');
  const words = (s.title || 'Hold your ground.').split(' ');

  return (
    <section className="relative w-full overflow-hidden bg-ink">
      <div className="relative aspect-[4/5] md:aspect-[16/9] w-full">
        {/* Crossfading images */}
        {has ? slides.map((sl, i) => (
          <picture key={sl.id ?? i} style={{ display: 'contents' }}>
            {sl.mobileImage && <source media="(max-width: 767px)" srcSet={heroMobileSrcSet(sl.mobileImage) || heroMobileSrc(sl.mobileImage)} sizes="100vw" />}
            <GzImage src={sl.image} w={1600} widths={HERO_WIDTHS} sizes="100vw" alt={sl.title || 'Gripzus'}
              priority={i === 0} fade={false} onReady={i === 0 ? () => setFirstReady(true) : undefined}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] ${i === current ? 'opacity-100' : 'opacity-0'}`} />
          </picture>
        )) : null}
        {/* Shimmer under the first slide until it has fully loaded + decoded
            (the <picture> wrappers are display:contents, so the box itself
            carries it). Never a half-drawn banner. */}
        {!firstReady && <Sk className="sk-fill" style={{ zIndex: 0 }} />}

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
