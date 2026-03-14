import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SafeImage from './common/SafeImage';
import '../styles/components/HeroSlider.css';

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

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('=== BUTTON CLICKED ===');
    console.log('Current slide index:', current);
    console.log('Total slides:', slides.length);
    console.log('All slides:', slides);
    
    const currentSlide = slides[current];
    
    console.log('Current slide data:', currentSlide);
    
    if (!currentSlide) {
      console.error('No current slide found');
      return;
    }

    console.log('Button clicked, current slide:', currentSlide);
    console.log('Category name:', currentSlide?.categoryName);

    // Redirect to Products page with category name
    // Products page will fetch category data and products based on this
    if (currentSlide?.categoryName) {
      const url = `/Products?category=${encodeURIComponent(currentSlide.categoryName)}`;
      console.log('Redirecting to:', url);
      console.log('Router ready:', router.isReady);
      
      // Ensure router is ready before pushing
      if (router.isReady) {
        console.log('Using router.push()');
        router.push(url);
      } else {
        // Fallback: use window.location if router not ready
        console.log('Router not ready, using window.location.href');
        window.location.href = url;
      }
    } else {
      console.log('No category name, redirecting to /Products');
      if (router.isReady) {
        router.push('/Products');
      } else {
        window.location.href = '/Products';
      }
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
              type="button"
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
