'use client';

import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import { ikSrc, ikSrcSet, HERO_W, HERO_MOBILE_W, HERO_WIDTHS, HERO_SIZES } from '@/lib/image';

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

  // Each slide stays invisible until fully downloaded AND decoded (no
  // top-half-first painting); the stage shows a shimmer until the current one
  // is ready. 'ok' = decoded, 'fail' = errored (keep the plain stage instead).
  const [ready, setReady] = useState({});
  const imgRefs = useRef([]);
  const mark = (i, v) => setReady((r) => (r[i] ? r : { ...r, [i]: v }));
  const onSlideLoad = (i) => (e) => {
    const img = e.currentTarget;
    const done = () => mark(i, 'ok');
    if (typeof img.decode === 'function') img.decode().then(done, done);
    else done();
  };
  useEffect(() => {
    // Loaded (or failed) before hydration, so onLoad never fired.
    imgRefs.current.forEach((img, i) => {
      if (img && img.complete) mark(i, img.naturalWidth > 0 ? 'ok' : 'fail');
    });
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
          {hasSlides && !ready[Math.min(current, slides.length - 1)] && <span className="sk sk-fill" aria-hidden="true" />}
          {hasSlides ? (
            slides.map((s, i) => (
              <picture key={i} style={{ display: 'contents' }}>
                {s.mobileImage && <source media="(max-width: 767px)" srcSet={ikSrc(s.mobileImage, HERO_MOBILE_W)} />}
                <img ref={(el) => { imgRefs.current[i] = el; }}
                  src={ikSrc(s.image, HERO_W)}
                  srcSet={s.mobileImage ? undefined : ikSrcSet(s.image, HERO_WIDTHS)}
                  sizes={s.mobileImage ? undefined : HERO_SIZES}
                  alt={s.title || 'Soxbae'}
                  className={`sxh-img${i === current ? ' active' : ''}${ready[i] === 'ok' ? '' : ' is-pending'}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  decoding="async"
                  onLoad={onSlideLoad(i)}
                  onError={() => mark(i, 'fail')} />
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
