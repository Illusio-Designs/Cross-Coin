'use client';

import { useState, useEffect, useRef } from 'react';
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

// Velquira hero — a centered editorial composition unique to the maison:
// a hairline-flanked eyebrow, a large serif headline, then a tall ARCHED
// image framed in gold (a jewellery-portal motif), with an inline hallmark
// strip beneath. Driven by the backend sliders API, falling back to static copy.
export default function Hero({ features = [], slides = [] }) {
  const [current, setCurrent] = useState(0);
  const hasSlides = slides.length > 0;
  // The arched frame reserves the box and shimmers; each slide photo stays
  // hidden until it is fully downloaded AND decoded (no top-half-first
  // painting), then fades in. `data-sk-img` + the pre-hydration script in
  // app/layout.jsx reveal the first slide even before React has loaded.
  const [ready, setReady] = useState({});
  const markReady = (i) => setReady((r) => (r[i] ? r : { ...r, [i]: true }));
  const sliderRef = useRef(null);
  useEffect(() => {
    const imgs = sliderRef.current ? sliderRef.current.querySelectorAll('img') : [];
    imgs.forEach((img, i) => { if (img.complete && img.naturalWidth > 0) markReady(i); });
  }, [slides.length]);
  const onSlideLoad = (i) => (e) => {
    const img = e.currentTarget;
    const done = () => markReady(i);
    if (typeof img.decode === 'function') img.decode().then(done, done); else done();
  };
  const firstReady = !!ready[0];

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = hasSlides ? slides[Math.min(current, slides.length - 1)] : null;
  const title = slide?.title || 'Fine jewellery, crafted to be treasured';
  const desc = slide?.description || 'Hallmarked gold, certified stones and timeless design — handmade in our Morbi studio for life’s most special moments.';
  const ctaText = slide?.buttonText || 'Explore the collection';
  const ctaHref = slide?.link || (slide?.categorySlug ? `/collections/${slide.categorySlug}` : '/products');

  return (
    <section className="vq-hero">
      <div className="container vq-hero-inner">
        <span className="vq-crest">MADE IN MORBI, INDIA</span>
        <span className="vq-eyebrow"><i /> <b>❖</b> Fine Gold Jewellery <b>❖</b> <i /></span>
        <h1 className="vq-hero-title">{title}</h1>
        <span className="vq-flourish" aria-hidden />
        <p className="vq-hero-desc">{desc}</p>
        <div className="vq-hero-cta">
          <a href={ctaHref} className="btn btn-primary">{ctaText}</a>
          <a href="/collections" className="vq-textlink">View collections <Icon name="ArrowRight" size={15} /></a>
        </div>

        <div className="vq-hero-frame">
          {hasSlides ? (
            <div className="vq-hero-slider" ref={sliderRef}>
              {!firstReady && <span className="sk sk-fill" aria-hidden="true" />}
              {slides.map((s, i) => (
                <picture key={i} style={{ display: 'contents' }}>
                  {s.mobileImage && <source media="(max-width: 767px)" srcSet={heroSrc(s.mobileImage, 820)} />}
                  <img src={heroSrc(s.image)} alt={s.title || 'Velquira'}
                    className={`vq-hero-img${i === current ? ' active' : ''}${ready[i] ? ' is-loaded' : ''}`}
                    data-sk-img=""
                    loading={i === 0 ? 'eager' : 'lazy'}
                    onLoad={onSlideLoad(i)}
                    onError={() => markReady(i)}
                    fetchPriority={i === 0 ? 'high' : 'auto'}
                    decoding="async" />
                </picture>
              ))}
            </div>
          ) : (
            <div className="vq-hero-ph" aria-hidden>
              <Icon name="Sparkles" size={64} />
              <span>Fine handmade jewellery</span>
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
