import React, { useState, useEffect, useMemo } from 'react';
import Skeleton from './Skeleton';
import { getImageUrl, getOptimizedImageUrl } from '../../utils/imageHandler';

/**
 * Detect browser support for modern image formats
 * Returns the best format supported by the browser
 * ✅ MEMOIZED: Only runs once per browser session
 */
const SUPPORTED_FORMAT = (() => {
  if (typeof window === 'undefined') {
    // Server-side: default to JPEG for compatibility
    return 'jpeg';
  }

  // Check for AVIF support
  const canvas = document.createElement('canvas');
  if (canvas.toDataURL('image/avif').indexOf('image/avif') === 0) {
    return 'avif';
  }

  // Check for WebP support
  if (canvas.toDataURL('image/webp').indexOf('image/webp') === 0) {
    return 'webp';
  }

  // Fallback to JPEG
  return 'jpeg';
})();

/**
 * Get responsive sizing parameters based on viewport width
 * Returns query parameters for image optimization
 */
function getResponsiveSizingParams(sizes) {
  if (typeof window === 'undefined') {
    return { width: 400, quality: 80 };
  }

  const viewportWidth = window.innerWidth;

  if (viewportWidth < 640) {
    return { width: 200, quality: 75 };
  }

  if (viewportWidth < 1024) {
    return { width: 300, quality: 78 };
  }

  return { width: 400, quality: 80 };
}

const SafeImage = ({ 
  imageData, 
  alt = "Product Image", 
  className = "", 
  style = {},
  fallbackSrc = null,
  width,
  height,
  isLogo = false,
  isProductCard = false,
  isSlider = false, // NEW: Skip skeleton for sliders
  priority = false,
  quality = 75,
  sizes = null,
  onLoadingComplete = null,
  fetchPriority = null,
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  // ✅ Use memoized format detection instead of state
  const supportedFormat = useMemo(() => SUPPORTED_FORMAT, []);

  useEffect(() => {
    let newSrc = null;
    
    if (imageData) {
      // Use centralized image handler utility
      newSrc = getImageUrl(imageData);
      
      // Add optimization for product cards
      if (isProductCard && newSrc && !newSrc.includes('?tr=')) {
        const { width: imgWidth, quality: imgQuality } = getResponsiveSizingParams(sizes);
        const format = supportedFormat === 'avif' ? 'avif' : 
                       supportedFormat === 'webp' ? 'webp' : 'jpeg';
        newSrc = `${newSrc}?w=${imgWidth}&q=${imgQuality}&fmt=${format}`;
      }
    }
    
    if (!newSrc && !isLogo && !isProductCard) {
      newSrc = fallbackSrc;
    }
    
    // For logos with /assets/ path, use directly without modification
    if (isLogo && imageData && typeof imageData === 'string' && imageData.startsWith('/assets/')) {
      newSrc = imageData;
    }
    
    // Only reset loading state if the source URL actually changed
    if (newSrc !== imageSrc) {
      setImageSrc(newSrc);
      setImageError(false);
      setImageLoading(true);
    }
  }, [imageData, fallbackSrc, isLogo, isProductCard, imageSrc, supportedFormat]);

  const handleError = (event) => {
    if (!imageError) {
      setImageError(true);
      setImageLoading(false);
      if (isLogo) {
        // For logos, keep trying to show the image, don't set to null
        // This allows the fallback text to show
      }
      else if (!isProductCard && imageSrc !== fallbackSrc) {
        setImageSrc(fallbackSrc);
      }
    }
  };

  const handleLoad = () => {
    setImageLoading(false);
    setShowSkeleton(false);
    if (onLoadingComplete) {
      onLoadingComplete();
    }
  };

  if (isLogo && (!imageSrc || imageError)) {
    return null;
  }

  if (isProductCard && !imageSrc) {
    return (
      <Skeleton
        width={width || '100%'}
        height={height || 'auto'}
        className={className}
        style={style}
        aspectRatio="1 / 1"
      />
    );
  }

  if (isProductCard && imageError) {
    return (
      <div
        className={`${className} image-skeleton`}
        style={{
          width: width || '100%',
          height: height || 'auto',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ccc',
          fontSize: '14px',
          ...style
        }}
        {...props}
      >
      </div>
    );
  }

  if (!imageSrc) {
    return null;
  }

  // Convert width/height for img tag
  const getNumericValue = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      return parseInt(val.replace(/px|%/g, '')) || undefined;
    }
    return undefined;
  };

  const imgWidth = getNumericValue(width);
  const imgHeight = getNumericValue(height);

  // Only show shimmer for product card images
  if (isProductCard) {
    return (
      <div 
        style={{ 
          position: 'relative', 
          width: width || '100%', 
          height: height || 'auto', 
          display: 'inline-block',
          aspectRatio: '1 / 1'
        }}
      >
        {showSkeleton && (
          <Skeleton
            width="100%"
            height="100%"
            className="product-card-skeleton"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1
            }}
            aspectRatio="1 / 1"
          />
        )}
        <img
          src={imageSrc}
          alt={alt}
          width={imgWidth}
          height={imgHeight}
          loading="lazy"
          fetchpriority={fetchPriority || (priority ? "high" : "low")}
          sizes={sizes}
          onError={handleError}
          onLoad={handleLoad}
          className={`${className} product-card-image-contain`}
          style={{
            ...style,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            opacity: showSkeleton ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
            position: 'relative',
            zIndex: 2
          }}
          {...props}
        />
      </div>
    );
  }

  // For non-product images (logo, slider, etc.) - no shimmer effect
  return (
    <img
      src={imageSrc}
      alt={alt}
      width={imgWidth}
      height={imgHeight}
      loading="lazy"
      fetchpriority={fetchPriority || (priority ? "high" : "low")}
      sizes={sizes}
      onError={handleError}
      onLoad={handleLoad}
      className={className}
      style={{
        ...style,
        width: width || style.width || '100%',
        height: height === 'auto' ? 'auto' : (height || style.height || 'auto'),
        objectFit: style.objectFit || 'cover',
        display: 'block'
      }}
      {...props}
    />
  );
};

export default SafeImage;
