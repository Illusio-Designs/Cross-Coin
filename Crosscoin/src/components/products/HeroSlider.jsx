import React, { useState, useEffect } from 'react';
import Skeleton from '../common/Skeleton';
import { collectionUrl } from '../../utils/collectionUrl';
import { getHeroSrcSet } from '../../utils/imageUtils';

const HeroSlider = ({ slides = [] }) => {
  const [current, setCurrent] = useState(0);
  // Initialise from the slides prop directly (not a client-only effect) so that
  // when slides are provided by SSR the hero image renders in the initial HTML
  // — the LCP element — instead of a skeleton that only resolves after hydration.
  // Server and client compute the same value, so hydration stays consistent.
  const [isLoading, setIsLoading] = useState(!(slides && slides.length > 0));

  useEffect(() => {
    // If slides arrive later (client-side fallback fetch), stop loading.
    if (slides && slides.length > 0) {
      setIsLoading(false);
    }
  }, [slides]);

  useEffect(() => {
    if (slides.length > 0) {
      const interval = setInterval(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [slides]);

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentSlide = slides[current];
    
    if (!currentSlide) {
      return;
    }

    if (currentSlide?.categoryName) {
      // Prefer the slide's categorySlug when the slider data carries one,
      // otherwise slugify the display name client-side. Either way we
      // land on /collections/<slug> (clean URL, no %20 / %C2%AE noise).
      const slugSource = currentSlide.categorySlug
        ? { slug: currentSlide.categorySlug }
        : currentSlide.categoryName;
      window.location.href = collectionUrl(slugSource);
    } else {
      window.location.href = '/Collections';
    }
  };

  // Show skeleton while loading
  if (isLoading || !slides || slides.length === 0) {
    return <Skeleton type="hero" />;
  }

  return (
    <div className="hero-slider">
      <div className="hero-slide" key={current}>
        <div className="hero-slide__image">
          <img
            src={slides[current].image}
            srcSet={getHeroSrcSet(slides[current])}
            sizes="(max-width: 600px) 100vw, (max-width: 1024px) 100vw, 100vw"
            alt={slides[current].title}
            width={1920}
            height={1080}
            fetchpriority="high"
            loading="eager"
            decoding="async"
          />
        </div>
        <div className="hero-slide__content">
          <div className="hero-slide__content-text">
            <h1>{slides[current].title}</h1>
            <p>{slides[current].description}</p>
            <button 
              className="hero-btn" 
              onClick={handleButtonClick}
              type="button"
            >
              {slides[current].buttonText}
            </button>
          </div>
        </div>
      </div>
      <div className="hero-slider__nav">
        {slides.map((_, idx) => (
          <button
            key={idx}
            className={`dot${idx === current ? ' active' : ''}`}
            onClick={() => setCurrent(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
