import React, { useState, useEffect } from 'react';
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
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (imageData && imageData.image_url) {
      const directUrl = getDirectImageUrl(imageData);
      console.log('SafeImage: Processing image URL:', directUrl);
      setImageSrc(directUrl);
      setImageError(false);
      setLoading(true);
    } else {
      console.log('SafeImage: No image data, using fallback');
      setImageSrc(fallbackSrc);
      setImageError(false);
      setLoading(false);
    }
  }, [imageData, fallbackSrc]);

  const handleError = (event) => {
    console.warn('SafeImage: Image failed to load:', imageSrc);
    if (!imageError && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setImageError(true);
      setLoading(true); // Try loading the fallback
    } else {
      setLoading(false);
    }
  };

  const handleLoad = () => {
    console.log('SafeImage: Image loaded successfully:', imageSrc);
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
          display: 'block',
          ...style
        }}
        {...props}
      />
      {loading && (
        <div 
          className="image-loading-overlay" 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(240, 240, 240, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '12px',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        >
          Loading...
        </div>
      )}
    </div>
  );
};

export default SafeImage;