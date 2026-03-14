import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SafeImage from './common/SafeImage';

const HeroSlider = ({ slides = [] }) => {
  const [current, setCurrent] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (slides.length > 0) {
      const interval = setInterval(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [slides]);

  const handleButtonClick = () => {
    const currentSlide = slides[current];
    
    if (!currentSlide) return;

    // Redirect to Products page with category name
    // Products page will fetch category data and products based on this
    if (currentSlide?.categoryName) {
      router.push(`/Products?category=${encodeURIComponent(currentSlide.categoryName)}`);
    } else {
      router.push('/Products');
    }
  };

  if (!slides || slides.length === 0) {
    return <div className="no-slides">No slides available</div>;
  }

  return (
    <div className="hero-slider">
      <div className="hero-slide" key={current}>
        <div className="hero-slide__image">
          <SafeImage 
            imageData={{ image_url: slides[current].image }}
            alt={slides[current].title}
            priority={true}
            quality={85}
            isSlider={true}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
        </div>
        <div className="hero-slide__content">
          <div className="hero-slide__content-text">
            <h1>{slides[current].title}</h1>
            <p>{slides[current].description}</p>
            <button 
              className="hero-btn" 
              onClick={handleButtonClick}
            >
              {slides[current].buttonText}
            </button>
          </div>
        </div>
      </div>
      <div className="hero-slider__nav">
        {slides.map((_, idx) => (
          <span 
            key={idx} 
            className={`dot${idx === current ? ' active' : ''}`} 
            onClick={() => setCurrent(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
