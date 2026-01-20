import React, { useState, useEffect, useMemo } from 'react';
import { getDirectImageUrl } from '../../utils/imageUtils';

const SafeImage = ({ 
  imageData, 
  alt = "Product Image", 
  className = "", 
  style = {},
  fallbackSrc = "/assets/card1-left.webp",
  width,
  height,
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Memoize the image URL to prevent repeated processing
  const imageSrc = useMemo(() => {
    if (imageData && imageData.image_url) {
      return getDirectImageUrl(imageData);
    }
    return fallbackSrc;
  }, [imageData, fallbackSrc]);

  // Reset states when image source changes
  useEffect(() => {
    setImageError(false);
    setLoading(true);
  }, [imageSrc]);

  const handleError = (event) => {
    if (!imageError && imageSrc !== fallbackSrc) {
      // Try fallback image
      setImageError(true);
      event.target.src = fallbackSrc;
    } else {
      // Even fallback failed, stop loading
      setLoading(false);
    }
  };

  const handleLoad = () => {
    setLoading(false);
  };

  // Don't render anything if no image source
  if (!imageSrc) {
    return (
      <div 
        className={`safe-image-container ${className}`} 
        style={{ 
          width: width || '100%',
          height: height || '200px',
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '14px',
          ...style
        }}
      >
        No Image
      </div>
    );
  }

  return (
    <div className={`safe-image-container ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      <img
        src={imageSrc}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          width: width || '100%',
          height: height || 'auto',
          objectFit: 'cover',
          display: loading ? 'none' : 'block',
          ...style
        }}
        {...props}
      />
      {loading && (
        <div 
          className="image-loading-overlay" 
          style={{
            width: width || '100%',
            height: height || '200px',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '12px',
            borderRadius: '4px'
          }}
        >
          Loading...
        </div>
      )}
    </div>
  );
};

export default SafeImage;