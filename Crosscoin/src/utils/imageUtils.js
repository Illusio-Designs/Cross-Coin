// Simple direct image URL builder - no caching, no complex processing
export function getDirectImageUrl(imageData) {
  if (!imageData || !imageData.image_url) {
    return null; // No fallback image
  }
  
  const imageUrl = imageData.image_url;
  
  // If already full URL, return as-is
  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }
  
  // If asset path, return as-is
  if (imageUrl.startsWith("/assets/")) {
    return imageUrl;
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
  const imageKitEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/wp2oatzmf";
  
  // ImageKit paths: /products/, /categories/, /sliders/
  if (imageUrl.startsWith("/products") || imageUrl.startsWith("/categories") || imageUrl.startsWith("/sliders")) {
    return `${imageKitEndpoint}${imageUrl}`;
  }
  
  if (imageUrl.startsWith("/uploads/")) {
    return `${baseUrl}${imageUrl}`;
  }
  
  // Bare filename — assume product image
  return `${imageKitEndpoint}/products/${imageUrl}`;
}

// Simple normalize function
export function normalizeImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null; // No fallback image
  }
  
  return getDirectImageUrl({ image_url: imageUrl });
}

export function getProductImageSrc(imageData) {
  return getDirectImageUrl(imageData);
}

// Enhanced image loading with error handling and fallback
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Get optimized image URL with size parameters and error handling
export function getOptimizedImageSrc(
  imageData,
  width = 300,
  height = 300,
  quality = 80
) {
  const baseSrc = getDirectImageUrl(imageData);

  // If it's an external URL or asset, return as-is
  if (baseSrc.startsWith("http") || baseSrc.startsWith("/assets/")) {
    return baseSrc;
  }

  // For uploaded images, you could add optimization parameters here
  // Example: return `${baseSrc}?w=${width}&h=${height}&q=${quality}`;
  return baseSrc;
}

// Check if image URL is accessible
export async function checkImageAccessibility(imageUrl) {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Get image with fallback handling
export function getImageWithFallback(imageData, fallbackImage = null) { // No default fallback
  const primaryImage = getDirectImageUrl(imageData);
  
  // If it's already a fallback asset, return it
  if (primaryImage.startsWith("/assets/")) {
    return primaryImage;
  }
  
  return primaryImage;
}

// Handle image error and provide fallback
export function handleImageError(event, fallbackSrc = null) { // No default fallback
  const img = event.target;
  if (fallbackSrc && img.src !== fallbackSrc) {
    img.src = fallbackSrc;
  }
}
