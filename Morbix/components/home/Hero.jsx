'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';

// Ask ImageKit for a sized, format-negotiated image instead of the full-res
// original (keeps the hero light).
function heroSrc(src, w = 1200) {
  if (!src || typeof src !== 'string') return src;
  if (src.includes('ik.imagekit.io') && !/[?&]tr=/.test(src)) {
    return `${src.split('?')[0]}?tr=w-${w},q-78,f-auto`;
  }
  return src;
}

// Hero — "Deal Band + colourways" layout. The left band is driven by the backend
// sliders (title/description/button cycle every 5s); the right shows shoppable
// colourway cards built from the home's bestseller feed (each exploded colour
// variant links straight to its PDP with the colour pre-selected).
export default function Hero({ features = [], slides = [], products = [] }) {
  const [current, setCurrent] = useState(0);
  const hasSlides = slides.length > 0;

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = hasSlides ? slides[Math.min(current, slides.length - 1)] : null;
  const badge = slide?.eyebrow || 'Premium collection';
  const title = slide?.title || 'Hot Deals';
  const desc = slide?.description || 'The best alignment socks at the best prices — limited-time offers.';
  const ctaText = slide?.buttonText || 'Shop now';
  const ctaHref = slide?.link || (slide?.categorySlug ? `/collections/${slide.categorySlug}` : '/products');

  // Up to 4 colourway cards from the bestseller feed.
  const cards = (Array.isArray(products) ? products : []).slice(0, 4);

  return (
    <section className="heroc container">
      <div className="heroc-band">
        <div className="heroc-copy">
          <span className="heroc-eyebrow">{badge}</span>
          <h1>{title}</h1>
          <p>{desc}</p>
          <div className="heroc-cta">
            {/^https?:\/\//i.test(ctaHref) ? (
              <a href={ctaHref} className="heroc-btn">{ctaText} <Icon name="ArrowRight" size={14} /></a>
            ) : (
              <Link href={ctaHref} className="heroc-btn">{ctaText} <Icon name="ArrowRight" size={14} /></Link>
            )}
            <Link href="/collections" className="heroc-link">Collections</Link>
          </div>
          {hasSlides && slides.length > 1 && (
            <div className="heroc-dots">
              {slides.map((_, i) => (
                <button key={i} type="button" className={i === current ? 'active' : ''} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
          )}
        </div>

        <div className="heroc-cards">
          {cards.length > 0 ? cards.map((p, i) => {
            const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
            const href = p.colorParam ? `/products/${p.slug}?color=${encodeURIComponent(p.colorParam)}` : `/products/${p.slug}`;
            return (
              <Link key={p.uid ?? p.id} href={href} className="heroc-pc">
                <span className="heroc-ph">
                  {p.image
                    ? <img src={heroSrc(p.image, 420)} alt={p.name} loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : 'auto'} decoding="async" />
                    : <Icon name="Footprints" size={30} />}
                  {off > 0 && <span className="heroc-off">{off}% OFF</span>}
                </span>
                <b>{p.colorParam || p.name}</b>
                <span className="heroc-pr">₹{Number(p.price).toFixed(0)}{p.oldPrice ? <s>₹{Number(p.oldPrice).toFixed(0)}</s> : null}</span>
              </Link>
            );
          }) : (
            <div className="heroc-spotlight" aria-hidden>
              <span className="heroc-spotlight-tag">Morbix</span>
              <Icon name="Footprints" size={90} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
