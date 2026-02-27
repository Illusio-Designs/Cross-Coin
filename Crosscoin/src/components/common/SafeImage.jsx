import React, { useState, useEffect } from 'react';

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
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    let newSrc = null;
    
    if (imageData) {
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
    
    if (!newSrc && !isLogo && !isProductCard) {
      newSrc = fallbackSrc;
    }
    
    setImageSrc(newSrc);
    setImageError(false);
    setImageLoading(true);
  }, [imageData, fallbackSrc, isLogo, isProductCard]);

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
  };

  if (isLogo && (!imageSrc || imageError)) {
    return null;
  }

  if (isProductCard && !imageSrc) {
    return (
      <div
        className={className}
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

  if (isProductCard && imageError) {
    return (
      <div
        className={className}
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

  return (
    <img
      src={imageSrc}
      alt={alt}
      width={imgWidth}
      height={imgHeight}
      loading={priority ? 'eager' : 'lazy'}
      onError={handleError}
      onLoad={handleLoad}
      className={`${className} ${isProductCard ? 'product-card-image-contain' : ''} ${imageLoading ? 'image-loading' : 'image-loaded'}`}
      style={{
        ...style,
        width: isProductCard ? '100%' : (width || style.width || '100%'),
        height: isProductCard ? '100%' : (height === 'auto' ? 'auto' : (height || style.height || 'auto')),
        objectFit: isProductCard ? 'contain' : (style.objectFit || 'cover'),
        display: 'block',
        filter: imageLoading ? 'grayscale(100%)' : 'grayscale(0%)',
        transition: 'filter 0.3s ease-in-out'
      }}
      {...props}
    />
  );
};

export default SafeImage;
