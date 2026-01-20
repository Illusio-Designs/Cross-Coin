// Cache for processed image URLs to prevent repeated processing
const imageUrlCache = new Map();

// Clear image URL cache (useful for development or when URLs change)
export function clearImageUrlCache() {
  imageUrlCache.clear();
}

// Normalize image URL to ensure consistent formatting
export function normalizeImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return "/assets/card1-left.webp";
  }
  
  // Check cache first
  if (imageUrlCache.has(imageUrl)) {
    return imageUrlCache.get(imageUrl);
  }
  
  let finalUrl;
  
  // If it's already a full HTTP URL, return as-is
  if (imageUrl.startsWith("http")) {
    finalUrl = imageUrl;
  }
  // If it's an asset path, return as-is
  else if (imageUrl.startsWith("/assets/")) {
    finalUrl = imageUrl;
  }
  else {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
    
    // If it already starts with /uploads/, just prepend the base URL
    if (imageUrl.startsWith("/uploads/")) {
      finalUrl = `${baseUrl}${imageUrl}`;
    }
    // If it's just a filename, add the full uploads/products path
    else {
      finalUrl = `${baseUrl}/uploads/products/${imageUrl}`;
    }
  }
  
  // Cache the result
  imageUrlCache.set(imageUrl, finalUrl);
  
  return finalUrl;
}

export function getProductImageSrc(imageData) {
  if (!imageData || !imageData.image_url) return "/assets/card1-left.webp";
  return normalizeImageUrl(imageData.image_url);
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
    console.warn('Image accessibility check failed:', error);
    return false;
  }
}

// Get image with fallback handling
export function getImageWithFallback(imageData, fallbackImage = "/assets/card1-left.webp") {
  const primaryImage = getDirectImageUrl(imageData);
  
  // If it's already a fallback asset, return it
  if (primaryImage.startsWith("/assets/")) {
    return primaryImage;
  }
  
  return primaryImage;
}

// Handle image error and provide fallback
export function handleImageError(event, fallbackSrc = "/assets/card1-left.webp") {
  const img = event.target;
  if (img.src !== fallbackSrc) {
    console.warn('Image failed to load, using fallback:', img.src);
    img.src = fallbackSrc;
  }
}

// Cache for processed image URLs to prevent repeated processing
const imageUrlCache = new Map();

// Get direct image URL (bypass Next.js optimization) with caching
export function getDirectImageUrl(imageData) {
  if (!imageData || !imageData.image_url) {
    return "/assets/card1-left.webp";
  }
  
  const imageUrl = imageData.image_url;
  
  // Check cache first
  if (imageUrlCache.has(imageUrl)) {
    return imageUrlCache.get(imageUrl);
  }
  
  let finalUrl;
  
  // If it's already a full HTTP URL, return as-is
  if (imageUrl.startsWith("http")) {
    finalUrl = imageUrl;
  }
  // If it's an asset path, return as-is
  else if (imageUrl.startsWith("/assets/")) {
    finalUrl = imageUrl;
  }
  // If it already starts with /uploads/, just prepend the base URL
  else if (imageUrl.startsWith("/uploads/")) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
    finalUrl = `${baseUrl}${imageUrl}`;
  }
  // If it's just a filename, add the full uploads/products path
  else {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
    finalUrl = `${baseUrl}/uploads/products/${imageUrl}`;
  }
  
  // Cache the result
  imageUrlCache.set(imageUrl, finalUrl);
  
  return finalUrl;
}
