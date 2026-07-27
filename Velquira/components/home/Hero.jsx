'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';

// Velquira hero — a centered editorial composition unique to the maison:
// a hairline-flanked eyebrow, a large serif headline, then a tall ARCHED
// image framed in gold (a jewellery-portal motif), with an inline hallmark
// strip beneath. Driven by the backend sliders API, falling back to static copy.
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
  const desc = slide?.description || 'Hallmarked gold, certified stones and timeless design — handcrafted in our Morbi atelier for life’s most cherished moments.';
  const ctaText = slide?.buttonText || 'Explore the collection';
  const ctaHref = slide?.link || (slide?.categorySlug ? `/collections/${slide.categorySlug}` : '/products');

  return (
    <section className="vq-hero">
      <div className="container vq-hero-inner">
        <span className="vq-crest">EST · MMXXIV · MORBI</span>
        <span className="vq-eyebrow"><i /> <b>❖</b> The Velquira Maison <b>❖</b> <i /></span>
        <h1 className="vq-hero-title">{title}</h1>
        <span className="vq-flourish" aria-hidden />
        <p className="vq-hero-desc">{desc}</p>
        <div className="vq-hero-cta">
          <a href={ctaHref} className="btn btn-primary">{ctaText}</a>
          <a href="/collections" className="vq-textlink">View collections <Icon name="ArrowRight" size={15} /></a>
        </div>

        <div className="vq-hero-frame">
          {hasSlides ? (
            <div className="vq-hero-slider">
              {slides.map((s, i) => (
                <img key={i} src={s.image} alt={s.title || 'Velquira'}
                  className={`vq-hero-img${i === current ? ' active' : ''}`}
                  loading={i === 0 ? 'eager' : 'lazy'} />
              ))}
            </div>
          ) : (
            <div className="vq-hero-ph" aria-hidden>
              <Icon name="Sparkles" size={64} />
              <span>Fine handcrafted jewellery</span>
            </div>
          )}
          {hasSlides && slides.length > 1 && (
            <div className="vq-hero-dots">
              {slides.map((_, i) => (
                <button key={i} type="button" className={i === current ? 'active' : ''} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
          )}
        </div>

        {features.length > 0 && (
          <div className="vq-hero-trust">
            {features.slice(0, 3).map((f, i) => (
              <span className="vq-hero-trust-item" key={f.title}>
                <Icon name={f.icon} size={16} /> {f.title}
                {i < 2 && <em className="vq-hero-trust-sep">✦</em>}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
