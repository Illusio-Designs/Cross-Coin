import React from 'react';
import Shimmer from './common/Shimmer';

/**
 * Hero Slider Skeleton Loader
 * Shows while slider data is loading
 */
const HeroSliderSkeleton = () => {
  return (
    <div className="hero-slider">
      <div className="hero-slide">
        <div className="hero-slide__image">
          <Shimmer width="100%" height="90vh" borderRadius="0" />
        </div>
        <div className="hero-slide__content">
          <div className="hero-slide__content-text">
            <h1>
              <Shimmer width="60%" height="60px" borderRadius="4px" style={{ marginBottom: '1rem' }} />
            </h1>
            <p>
              <Shimmer width="100%" height="24px" borderRadius="4px" style={{ marginBottom: '0.5rem' }} />
              <Shimmer width="95%" height="24px" borderRadius="4px" style={{ marginBottom: '3rem' }} />
            </p>
            <Shimmer width="150px" height="48px" borderRadius="4px" />
          </div>
        </div>
      </div>
      <div className="hero-slider__nav">
        {[1, 2].map((_, idx) => (
          <Shimmer 
            key={idx}
            width="10px" 
            height="10px" 
            borderRadius="50%" 
            style={{ marginRight: '15px' }}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSliderSkeleton;
