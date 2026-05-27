import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImage component - loads images only when visible in viewport
 * Improves performance by deferring off-screen image loads
 * Shows placeholder while loading, fallback on error
 */
const LazyImage = ({
  src,
  alt,
  width = 'auto',
  height = 'auto',
  className = '',
  placeholderSrc = null,
  onLoad = null,
  onError = null,
  threshold = '50px',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholderSrc || null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // Intersection Observer for lazy loading
    if (!('IntersectionObserver' in window)) {
      // Fallback: load immediately if IntersectionObserver not supported
      setImageSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: threshold,
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imgClass = [
    'lazy-image',
    isLoaded && 'lazy-image-loaded',
    hasError && 'lazy-image-error',
    className,
  ].filter(Boolean).join(' ');

  if (hasError) {
    return (
      <div
        style={{ width, height }}
        className={`${imgClass} lazy-image-fallback`}
        aria-label={`Failed to load: ${alt}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={imgClass}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        width,
        height,
        transition: 'opacity 0.3s ease-in',
        opacity: isLoaded ? 1 : 0.6,
      }}
      {...props}
    />
  );
};

export default LazyImage;
