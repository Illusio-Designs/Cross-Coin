export function getProductImageSrc(imageData) {
  if (!imageData || !imageData.image_url) return "/assets/card1-left.webp";
  const url = imageData.image_url;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/assets/")) return url; // Return asset path as-is
  const baseUrl =
    process.env.NEXT_PUBLIC_IMAGE_URL || "https://api.crosscoin.in";
  if (url.startsWith("/uploads/")) return `${baseUrl}${url}`;
  // If just a filename, add /uploads/products/
  return `${baseUrl}/uploads/products/${url}`;
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
