'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';

// Ask ImageKit for a sized, format-negotiated hero image instead of the
// full-resolution original (big LCP win on the largest image on the page).
function heroSrc(src) {
  if (!src || typeof src !== 'string') return src;
  if (src.includes('ik.imagekit.io') && !/[?&]tr=/.test(src)) {
    return `${src.split('?')[0]}?tr=w-1200,q-78,f-auto`;
  }
  return src;
}

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
  const title = slide?.title || 'Socks built for rhythm, comfort & every mile';
  const desc = slide?.description || 'Engineered knit, lasting cushioning and clean design for every step — for sport and the city alike.';
  const ctaText = slide?.buttonText || 'Shop the catalog';
  const ctaHref = slide?.link || (slide?.categorySlug ? `/collections/${slide.categorySlug}` : '/products');

  return (
    <section className="hero container">
      <div className="hero-card">
        <div className="hero-copy">
          <span className="hero-badge">Premium collection</span>
          <h1>{title}</h1>
          <p>{desc}</p>
          <div className="hero-cta">
            {/^https?:\/\//i.test(ctaHref) ? (
              <a href={ctaHref} className="btn btn-primary">{ctaText} <span className="arrow"><Icon name="ArrowRight" size={14} /></span></a>
            ) : (
              <Link href={ctaHref} className="btn btn-primary">{ctaText} <span className="arrow"><Icon name="ArrowRight" size={14} /></span></Link>
            )}
            <Link href="/collections" className="btn btn-ghost">Collections</Link>
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
                <img key={i} src={heroSrc(s.image)} alt={s.title || 'Morbix'}
                  className={`hero-slide-img${i === current ? ' active' : ''}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  decoding="async" />
              ))}
            </div>
          ) : (
            <div className="hero-spotlight" aria-hidden>
              <span className="hero-spotlight-tag">Morbix</span>
              <Icon name="Footprints" size={130} />
              <span className="hero-spotlight-cap">Premium knit socks</span>
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
