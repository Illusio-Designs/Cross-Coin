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

// Build an ImageKit-optimised URL for blog images (hero + card thumbnails).
// Requests an exact size as WebP/AVIF (f-auto) so images are sharp and light.
// Only rewrites ImageKit URLs — any existing transform is replaced; non-ImageKit
// sources (e.g. api.crosscoin.in /uploads) pass through unchanged.
export function getBlogImageSrc(url, { w, h, q = 80 } = {}) {
  if (!url || typeof url !== "string") return url || null;
  if (!url.includes("ik.imagekit.io")) return url;
  const base = url.split("?")[0];
  const parts = [];
  if (w) parts.push(`w-${w}`);
  if (h) parts.push(`h-${h}`);
  if (q) parts.push(`q-${q}`);
  parts.push("f-auto");
  return `${base}?tr=${parts.join(",")}`;
}

// Add an ImageKit width/quality transform to a single URL. Only rewrites
// ImageKit URLs (any existing ?tr= is replaced); everything else passes through
// unchanged. Width-only keeps the aspect ratio intact.
export function ikTransform(url, w, q = 78) {
  if (!url || typeof url !== "string" || !url.includes("ik.imagekit.io")) {
    return url || null;
  }
  return `${url.split("?")[0]}?tr=w-${w},q-${q},f-auto`;
}

// Build a consistent hero srcSet from a single slide image, at the three
// breakpoints HeroSlider uses (all 100vw). Used by BOTH the <img srcSet> and
// the <link rel=preload imageSrcSet> so the browser downloads the hero exactly
// once (a mismatch would fetch it twice). For non-ImageKit URLs it falls back
// to the slide's own thumbnail/mobile candidates.
export function getHeroSrcSet(slide) {
  if (!slide) return undefined;
  const img = slide.image;
  if (img && typeof img === "string" && img.includes("ik.imagekit.io")) {
    return `${ikTransform(img, 640)} 640w, ${ikTransform(img, 1024)} 1024w, ${ikTransform(img, 1600)} 1600w`;
  }
  return (
    slide.imageSrcSet ||
    `${slide.imageThumbnail || img} 400w, ${slide.imageMobile || img} 800w, ${img} 1600w`
  );
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
