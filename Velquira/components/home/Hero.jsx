'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';

// Hero driven by the backend sliders API: each slide's real title, description
// and button + image are shown, cycling every 5s (same idea as the other
// brands' hero sliders). Falls back to static copy when there are no sliders.
export default function Hero({ features = [], slides = [] }) {
  const [current, setCurrent] = useState(0);
  const hasSlides = slides.length > 0;

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = hasSlides ? slides[Math.min(current, slides.length - 1)] : null;
  const title = slide?.title || 'Fine jewellery, crafted to be treasured';
  const desc = slide?.description || 'Hallmarked gold, certified stones and timeless design — each Velquira piece is handcrafted in our Morbi atelier for life’s most cherished moments.';
  const ctaText = slide?.buttonText || 'Explore the collection';
  const ctaHref = slide?.link || (slide?.categorySlug ? `/collections/${slide.categorySlug}` : '/products');

  return (
    <section className="hero container">
      <div className="hero-card">
        <div className="hero-copy">
          <span className="hero-badge">The Velquira Maison</span>
          <h1>{title}</h1>
          <p>{desc}</p>
          <div className="hero-cta">
            <a href={ctaHref} className="btn btn-primary">{ctaText} <span className="arrow"><Icon name="ArrowRight" size={14} /></span></a>
            <a href="/collections" className="btn btn-ghost">Collections</a>
          </div>
          {hasSlides && slides.length > 1 && (
            <div className="hero-dots">
              {slides.map((_, i) => (
                <button key={i} type="button" className={i === current ? 'active' : ''} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
          )}
        </div>

        <div className="hero-visual">
          {hasSlides ? (
            <div className="hero-slider">
              {slides.map((s, i) => (
                <img key={i} src={s.image} alt={s.title || 'Velquira'}
                  className={`hero-slide-img${i === current ? ' active' : ''}`}
                  loading={i === 0 ? 'eager' : 'lazy'} />
              ))}
            </div>
          ) : (
            <div className="hero-spotlight" aria-hidden>
              <span className="hero-spotlight-tag">Velquira</span>
              <Icon name="Sparkles" size={120} />
              <span className="hero-spotlight-cap">Fine handcrafted jewellery</span>
            </div>
          )}

          <div className="hero-features">
            {features.slice(0, 3).map((f) => (
              <div className="hero-feature" key={f.title}>
                <span className="ic"><Icon name={f.icon} size={18} /></span>
                <div><b>{f.title}</b><span>{f.sub}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
