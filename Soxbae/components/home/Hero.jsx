'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';

// Soxbae hero — a NEW full-bleed black structure (not Morbix's rounded card):
// bold oversized headline on the left, an orange-framed square visual on the
// right, and a trust row underneath. Driven by the backend sliders API.
export default function Hero({ features = [], slides = [] }) {
  const [current, setCurrent] = useState(0);
  const hasSlides = slides.length > 0;

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = hasSlides ? slides[Math.min(current, slides.length - 1)] : null;
  const title = slide?.title || 'Socks that go hard. Feet that smile.';
  const desc = slide?.description || 'Cushioned, breathable and built to last — bold everyday socks for sport, street and everything between.';
  const ctaText = slide?.buttonText || 'Shop socks';
  const ctaHref = slide?.link || (slide?.categorySlug ? `/collections/${slide.categorySlug}` : '/products');

  return (
    <section className="sox-hero">
      <div className="container sox-hero-in">
        <div className="sox-hero-copy">
          <span className="sox-hero-tag"><i />Happiness in Feet</span>
          <h1 className="sox-hero-title">{title}</h1>
          <p className="sox-hero-desc">{desc}</p>
          <div className="sox-hero-cta">
            <a href={ctaHref} className="btn btn-primary">{ctaText} <Icon name="ArrowRight" size={15} /></a>
            <a href="/collections" className="btn btn-ghost">New drops</a>
          </div>
          {hasSlides && slides.length > 1 && (
            <div className="sox-hero-dots">
              {slides.map((_, i) => (
                <button key={i} type="button" className={i === current ? 'active' : ''} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
          )}
        </div>

        <div className="sox-hero-visual">
          {hasSlides ? (
            <div className="sox-hero-slider">
              {slides.map((s, i) => (
                <img key={i} src={s.image} alt={s.title || 'Soxbae'}
                  className={`sox-hero-img${i === current ? ' active' : ''}`} loading={i === 0 ? 'eager' : 'lazy'} />
              ))}
            </div>
          ) : (
            <div className="sox-hero-ph" aria-hidden><Icon name="Footprints" size={88} /><span>Premium knit socks</span></div>
          )}
          <span className="sox-hero-badge">Free shipping ★</span>
        </div>
      </div>

      {features.length > 0 && (
        <div className="container sox-hero-trust">
          {features.slice(0, 4).map((f) => (
            <span className="sox-hero-trust-item" key={f.title}><Icon name={f.icon} size={16} /> {f.title}</span>
          ))}
        </div>
      )}
    </section>
  );
}
