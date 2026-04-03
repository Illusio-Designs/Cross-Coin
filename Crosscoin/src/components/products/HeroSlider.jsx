import React, { useState, useEffect } from 'react';
import Skeleton from '../common/Skeleton';

const HeroSlider = ({ slides = [] }) => {
  const [current, setCurrent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If slides are provided and not empty, stop loading
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
      const categoryName = currentSlide.categoryName;
      const url = `/Products?category=${encodeURIComponent(categoryName)}`;
      window.location.href = url;
    } else {
      window.location.href = '/Products';
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
            srcSet={slides[current].imageSrcSet || `${slides[current].imageThumbnail || slides[current].image} 400w, ${slides[current].imageMobile || slides[current].image} 800w, ${slides[current].image} 1600w`}
            sizes="(max-width: 600px) 100vw, (max-width: 1024px) 100vw, 100vw"
            alt={slides[current].title}
            fetchpriority="high"
            loading="eager"
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
