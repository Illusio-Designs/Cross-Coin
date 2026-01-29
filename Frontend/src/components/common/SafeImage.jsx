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

  // Build URL directly inline
  let imageSrc = fallbackSrc;
  
  if (imageData) {
    let rawUrl = null;
    
    // Handle different image data formats
    if (typeof imageData === 'string') {
      rawUrl = imageData;
    } else if (imageData.image_url) {
      rawUrl = imageData.image_url;
    } else if (imageData.url) {
      rawUrl = imageData.url;
    }
    
    // Process the URL
    if (rawUrl) {
      // If already a full URL, use it
      if (rawUrl.startsWith("http")) {
        imageSrc = rawUrl;
      } 
      // If it's an assets path, use it directly
      else if (rawUrl.startsWith("/assets/")) {
        imageSrc = rawUrl;
      } 
      // If it starts with /uploads/, prepend the API URL
      else if (rawUrl.startsWith("/uploads/")) {
        imageSrc = `https://api.crosscoin.in${rawUrl}`;
      } 
      // Otherwise assume it's just a filename in products folder
      else {
        imageSrc = `https://api.crosscoin.in/uploads/products/${rawUrl}`;
      }
    }
  }

  const handleError = (event) => {
    if (!imageError && imageSrc !== fallbackSrc) {
      setImageError(true);
      event.target.src = fallbackSrc;
    }
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      onError={handleError}
      className={className}
      style={{
        width: width || '100%',
        height: height || 'auto',
        objectFit: 'cover',
        ...style
      }}
      {...props}
    />
  );
};

export default SafeImage;