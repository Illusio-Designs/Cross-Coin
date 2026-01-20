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
    if (!imageError) {
      console.warn('Image failed to load, using fallback:', imageSrc);
      setImageSrc(fallbackSrc);
      setImageError(true);
    }
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <div className={`safe-image-container ${className}`} style={style}>
      {loading && !imageError && (
        <div className="image-loading-placeholder" style={{
          width: width || '100%',
          height: height || '200px',
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          Loading...
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          display: loading && !imageError ? 'none' : 'block',
          width: width || '100%',
          height: height || 'auto',
          objectFit: 'cover',
          ...style
        }}
        {...props}
      />
    </div>
  );
};

export default SafeImage;