'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';

// Ask ImageKit for a sized, format-negotiated hero image instead of the
// full-resolution original (big LCP win on the largest image on the page).
function heroSrc(src, w = 1600) {
  if (!src || typeof src !== 'string') return src;
  if (src.includes('ik.imagekit.io') && !/[?&]tr=/.test(src)) {
    return `${src.split('?')[0]}?tr=w-${w},q-78,f-auto`;
  }
  return src;
}

// Soxbae hero — an immersive "cover" stage: a large full-bleed product image
// with the headline + CTA laid over a warm scrim, bottom-left. Driven by the
// backend sliders API.
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
      <div className="container">
        <div className="sxh-stage">
          {hasSlides ? (
            slides.map((s, i) => (
              <picture key={i} style={{ display: 'contents' }}>
                {s.mobileImage && <source media="(max-width: 767px)" srcSet={heroSrc(s.mobileImage, 820)} />}
                <img src={heroSrc(s.image)} alt={s.title || 'Soxbae'}
                  className={`sxh-img${i === current ? ' active' : ''}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  decoding="async" />
              </picture>
            ))
          ) : (
            <div className="sxh-ph" aria-hidden><Icon name="Footprints" size={90} /></div>
          )}

          <div className="sxh-scrim" />

          <div className="sxh-inner">
            <span className="sxh-kicker">Happiness in feet</span>
            <h1 className="sxh-title">{title}</h1>
            <p className="sxh-desc">{desc}</p>
            <div className="sxh-actions">
              <a href={ctaHref} className="sxh-btn">{ctaText}</a>
              <a href="/collections" className="sxh-link">New arrivals <Icon name="ArrowRight" size={15} /></a>
            </div>
          </div>

          <span className="sxh-badge">Free shipping on all orders</span>

          {/* Mobile: the site overlay is hidden (the poster has its own headline
              + CTA), so make the whole stage tap through to the slide's target. */}
          <a className="sxh-tap" href={ctaHref} aria-label={ctaText} />

          {hasSlides && slides.length > 1 && (
            <div className="sxh-dots">
              {slides.map((_, i) => (
                <button key={i} type="button" className={i === current ? 'active' : ''} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
