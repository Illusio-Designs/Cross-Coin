import React from 'react';

/**
 * Hero Slider Skeleton Loader
 * Shows while slider is loading
 */
const HeroSliderSkeleton = () => {
  return (
    <div className="hero-slider" style={{ pointerEvents: 'none' }}>
      <div className="hero-slide">
        <div className="hero-slide__image">
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-skeleton 1.5s infinite linear'
            }}
          />
        </div>
        <div className="hero-slide__content">
          <div className="hero-slide__content-text">
            {/* Title skeleton */}
            <div
              style={{
                width: '70%',
                height: '60px',
                background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer-skeleton 1.5s infinite linear',
                marginBottom: '16px',
                borderRadius: '4px'
              }}
            />
            {/* Description skeleton */}
            <div
              style={{
                width: '50%',
                height: '24px',
                background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer-skeleton 1.5s infinite linear',
                marginBottom: '16px',
                borderRadius: '4px'
              }}
            />
            {/* Button skeleton */}
            <div
              style={{
                width: '120px',
                height: '40px',
                background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer-skeleton 1.5s infinite linear',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSliderSkeleton;
