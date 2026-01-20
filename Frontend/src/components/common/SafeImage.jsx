import React, { useState } from 'react';

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

  // Build URL directly inline - simplest possible approach
  let imageSrc = fallbackSrc;
  
  if (imageData && imageData.image_url) {
    const imageUrl = imageData.image_url;
    
    if (imageUrl.startsWith("http")) {
      imageSrc = imageUrl;
    } else if (imageUrl.startsWith("/assets/")) {
      imageSrc = imageUrl;
    } else if (imageUrl.startsWith("/uploads/")) {
      imageSrc = `https://api.crosscoin.in${imageUrl}`;
    } else {
      imageSrc = `https://api.crosscoin.in/uploads/products/${imageUrl}`;
    }
  }

  const handleError = (event) => {
    if (!imageError && imageSrc !== fallbackSrc) {
      setImageError(true);
      event.target.src = fallbackSrc;
      setLoading(true);
    } else {
      setLoading(false);
    }
  };

  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <div className={`safe-image-container ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      {loading && (
        <div 
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
    </div>
  );
};

export default SafeImage;