export function getProductImageSrc(imageData) {
  if (!imageData) return '/placeholder-image.jpg';
  let imageUrl = imageData.image_url || imageData;
  if (!imageUrl) return '/placeholder-image.jpg';

  // If it's a full URL, use as is
  if (/^https?:\/\//.test(imageUrl)) {
    return imageUrl;
  }
  // If it's a relative path, prepend the base URL from env
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://api.crosscoin.in';
  if (imageUrl.startsWith('/')) {
    return `${baseUrl}${imageUrl}`;
  }
  // If it's just a filename, construct the path
  return `${baseUrl}/uploads/products/${imageUrl}`;
} 