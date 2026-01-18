// Normalize image URL to ensure consistent formatting
export function normalizeImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return "/assets/card1-left.webp";
  }
  
  // If it's already a full HTTP URL, return as-is
  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }
  
  // If it's an asset path, return as-is
  if (imageUrl.startsWith("/assets/")) {
    return imageUrl;
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
  
  // If it already starts with /uploads/, just prepend the base URL
  if (imageUrl.startsWith("/uploads/")) {
    return `${baseUrl}${imageUrl}`;
  }
  
  // If it's just a filename, add the full uploads/products path
  return `${baseUrl}/uploads/products/${imageUrl}`;
}

export function getProductImageSrc(imageData) {
  if (!imageData || !imageData.image_url) return "/assets/card1-left.webp";
  return normalizeImageUrl(imageData.image_url);
}

// Optimized image loading with preloading
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Get optimized image URL with size parameters
export function getOptimizedImageSrc(
  imageData,
  width = 300,
  height = 300,
  quality = 80
) {
  const baseSrc = getProductImageSrc(imageData);

  // If it's an external URL or asset, return as-is
  if (baseSrc.startsWith("http") || baseSrc.startsWith("/assets/")) {
    return baseSrc;
  }

  // For uploaded images, you could add optimization parameters here
  // Example: return `${baseSrc}?w=${width}&h=${height}&q=${quality}`;
  return baseSrc;
}
