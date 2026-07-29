'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';

// Soxbae hero — editorial premium: a calm ivory stage with a large display-serif
// headline and a quiet underlined link on the left, and a big softly-framed
// product image on the right. Driven by the backend sliders API.
export default function Hero({ features = [], slides = [] }) {
  const [current, setCurrent] = useState(0);
  const hasSlides = slides.length > 0;

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = hasSlides ? slides[Math.min(current, slides.length - 1)] : null;
  const title = slide?.title || 'Socks made for how you move.';
  const desc = slide?.description || 'Cushioned, breathable and built to last — considered everyday socks for sport, street and everything between.';
  const ctaText = slide?.buttonText || 'Shop the collection';
  const ctaHref = slide?.link || (slide?.categorySlug ? `/collections/${slide.categorySlug}` : '/products');

  return (
    <section className="sx-hero">
      <div className="container sx-hero-in">
        <div className="sx-hero-copy">
          <span className="sx-hero-eyebrow">Happiness in feet</span>
          <h1 className="sx-hero-title">{title}</h1>
          <p className="sx-hero-desc">{desc}</p>
          <div className="sx-hero-cta">
            <a href={ctaHref} className="sx-link">{ctaText} <Icon name="ArrowRight" size={15} /></a>
            <a href="/collections" className="sx-link sx-link-quiet">New arrivals</a>
          </div>
          {hasSlides && slides.length > 1 && (
            <div className="sx-hero-dots">
              {slides.map((_, i) => (
                <button key={i} type="button" className={i === current ? 'active' : ''} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
          )}
        </div>

        <div className="sx-hero-visual">
          <span className="sx-hero-tag">Est. Soxbae</span>
          {hasSlides ? (
            <div className="sx-hero-slider">
              {slides.map((s, i) => (
                <img key={i} src={s.image} alt={s.title || 'Soxbae'}
                  className={`sx-hero-img${i === current ? ' active' : ''}`} loading={i === 0 ? 'eager' : 'lazy'} />
              ))}
            </div>
          ) : (
            <div className="sx-hero-ph" aria-hidden><Icon name="Footprints" size={80} /><span>Premium knit socks</span></div>
          )}
        </div>
      </div>

      {features.length > 0 && (
        <div className="container sx-hero-trust">
          {features.slice(0, 4).map((f) => (
            <span className="sx-hero-trust-item" key={f.title}><Icon name={f.icon} size={15} /> {f.title}</span>
          ))}
        </div>
      )}
    </section>
  );
}
