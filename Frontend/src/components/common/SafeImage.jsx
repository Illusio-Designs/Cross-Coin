import React, { useState, useEffect } from 'react';

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
  const [imageSrc, setImageSrc] = useState(fallbackSrc);

  useEffect(() => {
    // Build URL when imageData changes
    let newSrc = fallbackSrc;
    
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
          newSrc = rawUrl;
        } 
        // If it's an assets path, use it directly
        else if (rawUrl.startsWith("/assets/")) {
          newSrc = rawUrl;
        } 
        // If it starts with /uploads/, prepend the API URL
        else if (rawUrl.startsWith("/uploads/")) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
          newSrc = `${apiUrl}${rawUrl}`;
        } 
        // Otherwise assume it's just a filename in products folder
        else {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
          newSrc = `${apiUrl}/uploads/products/${rawUrl}`;
        }
      }
    }
    
    setImageSrc(newSrc);
    setImageError(false);
  }, [imageData, fallbackSrc]);

  const handleError = (event) => {
    if (!imageError && imageSrc !== fallbackSrc) {
      setImageError(true);
      setImageSrc(fallbackSrc);
    }
  };

  const handleLoad = () => {
    // Image loaded successfully
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      onError={handleError}
      onLoad={handleLoad}
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