import React, { useState, useMemo } from 'react';
import Skeleton from './Skeleton';
import { getImageUrl } from '../../utils/imageHandler';

/**
 * Compute the final <img> src SYNCHRONOUSLY (SSR-safe). Doing this during
 * render — instead of in a useEffect — means the URL is present in the
 * server-rendered HTML, so the browser starts downloading the image before
 * JS hydration. This is the key LCP fix: previously imageSrc was null on
 * first paint and every image waited for hydration + an effect to load.
 */
function computeImageSrc({ imageData, fallbackSrc, isLogo, isProductCard, isSlider }) {
  let newSrc = null;
  if (imageData) {
    newSrc = getImageUrl(imageData);
    // Optimize ImageKit images with ImageKit's real transform syntax
    // (tr=w-…,q-…,f-auto). Width-only so aspect ratio is preserved; f-auto
    // delivers WebP/AVIF automatically based on the browser's Accept header.
    if (newSrc && newSrc.includes('ik.imagekit.io') && !/[?&]tr=/.test(newSrc)) {
      const w = isSlider ? 1600 : (isProductCard ? 600 : 800);
      newSrc = `${newSrc.split('?')[0]}?tr=w-${w},q-78,f-auto`;
    }
  }
  if (!newSrc && !isLogo && !isProductCard) newSrc = fallbackSrc;
  // Logos with an /assets/ path are used verbatim.
  if (isLogo && imageData && typeof imageData === 'string' && imageData.startsWith('/assets/')) {
    newSrc = imageData;
  }
  return newSrc;
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
  const [showSkeleton, setShowSkeleton] = useState(true);
  // Whether a load error made us fall back to fallbackSrc (non-logo images).
  const [useFallback, setUseFallback] = useState(false);

  // Computed during render → present in SSR HTML (see computeImageSrc note).
  const computedSrc = useMemo(
    () => computeImageSrc({ imageData, fallbackSrc, isLogo, isProductCard, isSlider }),
    [imageData, fallbackSrc, isLogo, isProductCard, isSlider]
  );
  const imageSrc = (useFallback && !isLogo && !isProductCard) ? fallbackSrc : computedSrc;

  const handleError = (event) => {
    if (!imageError) {
      setImageError(true);
      // For logos, keep the element so any text fallback shows. For other
      // non-card images, swap to the fallback source once.
      if (!isLogo && !isProductCard && computedSrc !== fallbackSrc) {
        setUseFallback(true);
      }
    }
  };

  const handleLoad = () => {
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
          fetchPriority={fetchPriority || (priority ? "high" : "low")}
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
      fetchPriority={fetchPriority || (priority ? "high" : "low")}
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
