import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Gripzus hero — editorial gallery (SSENSE-inspired).
   Full-bleed campaign image, edge to edge, with a quiet caption block
   set low-left and a minimal slide index. The image is the story.
   slide shape: { id, eyebrow, title, description, image, buttonText, buttonLink } */

export default function HeroBanner({ slides = [] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) {
    return <section className="h-[86vh] min-h-[540px] bg-paper-deep animate-pulse" />;
  }

  const s = slides[Math.min(current, slides.length - 1)];

  return (
    <section className="relative overflow-hidden bg-paper-deep">
      <div className="relative h-[88vh] md:h-[92vh] min-h-[560px]">
        {slides.map((sl, i) => (
          <img
            key={sl.id ?? i}
            src={sl.image}
            alt={sl.title || 'Gripzus'}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${i === current ? 'opacity-100' : 'opacity-0'}`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}

        {/* barely-there scrim, only lower third */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />

        {/* caption — low-left, quiet */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="wrap pb-8 md:pb-12">
            <div className="max-w-2xl">
              <span className="kicker kicker-light mb-4">{s.eyebrow || 'Gripzus — SS26'}</span>
              <h1 className="h-display text-paper text-3xl md:text-5xl lg:text-6xl max-w-xl whitespace-pre-line">
                {s.title || 'The grip\nedit.'}
              </h1>
              {s.description && (
                <p className="text-paper/80 text-[13px] md:text-sm mt-4 max-w-md leading-6">{s.description}</p>
              )}
              <div className="mt-6 flex items-center gap-6">
                <Link href={s.buttonLink || '/products'} className="btn-light">
                  {s.buttonText || 'Shop the edit'}
                </Link>
                <Link href="/collections" className="text-paper text-[11px] uppercase tracking-[0.14em] border-b border-paper/70 pb-0.5 hover:opacity-60 transition-opacity">
                  Collections
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* slide index — bottom-right, tiny */}
        {slides.length > 1 && (
          <div className="absolute right-4 md:right-10 bottom-8 md:bottom-12 z-20 flex items-center gap-3">
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                  className={`h-[3px] transition-all duration-300 ${i === current ? 'w-7 bg-paper' : 'w-3.5 bg-paper/45 hover:bg-paper/70'}`} />
              ))}
            </div>
            <span className="text-paper/80 text-[10px] tracking-[0.12em] tabular-nums">
              {String(current + 1).padStart(2, '0')}—{String(slides.length).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
