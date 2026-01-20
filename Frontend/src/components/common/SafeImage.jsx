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
  const [imageSrc, setImageSrc] = useState(fallbackSrc);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (imageData) {
      const directUrl = getDirectImageUrl(imageData);
      console.log('SafeImage: Processing image URL:', directUrl);
      setImageSrc(directUrl);
      setImageError(false);
      setLoading(true);
    } else {
      setImageSrc(fallbackSrc);
      setImageError(false);
      setLoading(false);
    }
  }, [imageData, fallbackSrc]);

  const handleError = (event) => {
    console.warn('SafeImage: Image failed to load:', imageSrc);
    if (!imageError) {
      setImageSrc(fallbackSrc);
      setImageError(true);
    }
    setLoading(false);
  };

  const handleLoad = () => {
    console.log('SafeImage: Image loaded successfully:', imageSrc);
    setLoading(false);
  };

  return (
    <div className={`safe-image-container ${className}`} style={{ position: 'relative', ...style }}>
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
      {loading && !imageError && (
        <div 
          className="image-loading-placeholder" 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: width || '100%',
            height: height || '200px',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '14px',
            zIndex: 1
          }}
        >
          Loading...
        </div>
      )}
    </div>
  );
};

export default SafeImage;