'use client';

import { useState, useEffect } from 'react';

// Auto-rotating hero slider fed by the backend /api/sliders/listing API.
// Cross-fades through the slides every 4s; dots let you jump. Falls back to
// nothing (the Hero shows its branded panel) when there are no sliders.
export default function HeroSlider({ slides = [] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <div className="hero-slider">
      {slides.map((s, n) => {
        const img = (
          <img
            src={s.image}
            alt={s.title || 'Morbix'}
            className={`hero-slide-img${n === i ? ' active' : ''}`}
            loading={n === 0 ? 'eager' : 'lazy'}
          />
        );
        return (
          <div className={`hero-slide${n === i ? ' active' : ''}`} key={n}>
            {s.link ? <a href={s.link} aria-label={s.title || 'Shop'}>{img}</a> : img}
          </div>
        );
      })}

      {slides.length > 1 && (
        <div className="hero-slider-dots">
          {slides.map((_, n) => (
            <button
              key={n}
              type="button"
              className={n === i ? 'active' : ''}
              onClick={() => setI(n)}
              aria-label={`Go to slide ${n + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
