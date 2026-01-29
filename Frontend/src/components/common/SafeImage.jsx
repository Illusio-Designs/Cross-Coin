import React, { useState, useEffect } from 'react';

const SafeImage = ({ 
  imageData, 
  alt = "Product Image", 
  className = "", 
  style = {},
  fallbackSrc = "/assets/card1-left.webp",
  width,
  height,
  isLogo = false, // New prop to identify logo images
  isProductCard = false, // New prop to identify product card images
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    // Build URL when imageData changes
    let newSrc = null;
    
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
      if (rawUrl && rawUrl.trim() !== '') {
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
    
    // If no valid image source and it's not a logo or product card, use fallback
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
      // For product cards, we'll show gray placeholder in the render logic
      // For logos, we set imageSrc to null to hide completely
      if (isLogo) {
        setImageSrc(null);
      }
      // For other images (not product cards or logos), show fallback
      else if (!isProductCard && imageSrc !== fallbackSrc) {
        setImageSrc(fallbackSrc);
      }
    }
  };

  const handleLoad = () => {
    // Image loaded successfully
    setImageLoading(false);
  };

  // Don't render anything if it's a logo and there's no valid image
  if (isLogo && (!imageSrc || imageError)) {
    return null;
  }

  // For product cards with error, show gray placeholder
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

  // Don't render if no image source
  if (!imageSrc) {
    return null;
  }

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