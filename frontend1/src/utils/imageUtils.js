export function getProductImageSrc(imageData) {
  if (!imageData || !imageData.image_url) return '/assets/card1-left.webp';
  const url = imageData.image_url;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/assets/')) return url; // Return asset path as-is
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
  if (url.startsWith('/uploads/')) return `${baseUrl}${url}`;
  // If just a filename, add /uploads/products/
  return `${baseUrl}/uploads/products/${url}`;
} 