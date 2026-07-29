'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';

// Soxbae hero — refined editorial: a calm ivory field, an elegant headline with
// a small orange eyebrow, a minimal dark CTA + text link, and a large clean
// product frame on the right (neutral, not a loud colour block). Backend-driven.
export default function Hero({ features = [], slides = [] }) {
  const [current, setCurrent] = useState(0);
  const hasSlides = slides.length > 0;

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = hasSlides ? slides[Math.min(current, slides.length - 1)] : null;
  const title = slide?.title || 'The everyday sock, quietly perfected.';
  const desc = slide?.description || 'Cushioned, breathable and made to last — considered essentials for feet that do more.';
  const ctaText = slide?.buttonText || 'Shop the collection';
  const ctaHref = slide?.link || (slide?.categorySlug ? `/collections/${slide.categorySlug}` : '/products');

  return (
    <section className="shx-hero">
      <div className="container shx-hero-in">
        <div className="shx-hero-copy">
          <span className="shx-hero-eyebrow"><i />Happiness in Feet</span>
          <h1 className="shx-hero-title">{title}</h1>
          <p className="shx-hero-desc">{desc}</p>
          <div className="shx-hero-cta">
            <a href={ctaHref} className="shx-btn-dark">{ctaText}</a>
            <a href="/collections" className="shx-btn-link">New drops <Icon name="ArrowRight" size={14} /></a>
          </div>
          {hasSlides && slides.length > 1 && (
            <div className="shx-hero-dots">
              {slides.map((_, i) => (
                <button key={i} type="button" className={i === current ? 'active' : ''} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
          )}
        </div>

        <div className="shx-hero-visual">
          <div className="shx-hero-frame">
            {hasSlides ? (
              slides.map((s, i) => (
                <img key={i} src={s.image} alt={s.title || 'Soxbae'}
                  className={`shx-hero-img${i === current ? ' active' : ''}`} loading={i === 0 ? 'eager' : 'lazy'} />
              ))
            ) : (
              <div className="shx-hero-ph" aria-hidden><Icon name="Footprints" size={64} /><span>Premium knit socks</span></div>
            )}
          </div>
          <span className="shx-hero-badge">Free shipping over ₹499</span>
        </div>
      </div>

      {features.length > 0 && (
        <div className="shx-hero-trust">
          <div className="container shx-hero-trust-in">
            {features.slice(0, 4).map((f) => (
              <span className="shx-hero-trust-item" key={f.title}><Icon name={f.icon} size={16} /> {f.title}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
