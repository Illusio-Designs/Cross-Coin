import React, { useState, useEffect, useMemo } from 'react';
import Skeleton from '../Skeleton';

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
    // Server-side: default to desktop sizing
    return { width: 600, quality: 85 };
  }

  // Determine viewport width
  const viewportWidth = window.innerWidth;

  // Mobile (< 640px): smaller image, lower quality
  if (viewportWidth < 640) {
    return { width: 300, quality: 80 };
  }

  // Tablet (640px - 1024px): medium image, medium quality
  if (viewportWidth < 1024) {
    return { width: 450, quality: 82 };
  }

  // Desktop (> 1024px): larger image, higher quality
  return { width: 600, quality: 85 };
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
      // Priority 1: Use ImageKit optimized URLs if available (from API response)
      if (isProductCard && imageData.medium) {
        // Use medium size for product cards (600x600px)
        newSrc = imageData.medium;
      } 
      // Priority 2: Use thumbnail for smaller displays
      else if (isProductCard && imageData.thumbnail) {
        newSrc = imageData.thumbnail;
      }
      // Priority 3: Fall back to raw image_url and construct URL
      else {
        let rawUrl = null;
        
        if (typeof imageData === 'string') {
          rawUrl = imageData;
        } else if (imageData.image_url) {
          rawUrl = imageData.image_url;
        } else if (imageData.url) {
          rawUrl = imageData.url;
        }
        
        if (rawUrl && rawUrl.trim() !== '') {
          if (rawUrl.startsWith("http")) {
            newSrc = rawUrl;
          } 
          else if (rawUrl.startsWith("/assets/")) {
            newSrc = rawUrl;
          } 
          else if (rawUrl.startsWith("/uploads/")) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
            newSrc = `${apiUrl}${rawUrl}`;
          } 
          else {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
            newSrc = `${apiUrl}/uploads/products/${rawUrl}`;
          }
        }
      }
    }
    
    if (!newSrc && !isLogo && !isProductCard) {
      newSrc = fallbackSrc;
    }
    
    // Add responsive sizing and format optimization query parameters for product cards
    // Only if ImageKit URLs are not already being used (they already have optimization)
    if (newSrc && isProductCard && !newSrc.includes('?tr=') && !newSrc.includes('?')) {
      // Get responsive sizing parameters based on viewport width
      const { width: imgWidth, quality: imgQuality } = getResponsiveSizingParams(sizes);
      
      // Add format negotiation: AVIF for modern browsers, WebP as fallback, JPEG for legacy
      // The format parameter tells the server which format to serve
      const format = supportedFormat === 'avif' ? 'avif' : 
                     supportedFormat === 'webp' ? 'webp' : 'jpeg';
      
      newSrc = `${newSrc}?w=${imgWidth}&q=${imgQuality}&fmt=${format}`;
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
        setImageSrc(null);
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
