/**
 * Centralized image handling utility
 * Eliminates duplicate image logic across components
 */

export const getImageUrl = (imageData) => {
  if (!imageData) return null;

  let rawUrl = null;

  // Extract URL from various formats
  if (typeof imageData === 'string') {
    rawUrl = imageData;
  } else if (imageData?.image_url) {
    rawUrl = imageData.image_url;
  } else if (imageData?.url) {
    rawUrl = imageData.url;
  }

  if (!rawUrl || rawUrl.trim() === '') return null;

  // Handle different URL formats
  if (rawUrl.startsWith('http')) {
    return rawUrl;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

  if (rawUrl.startsWith('/uploads/')) {
    return `${baseUrl}${rawUrl}`;
  }

  if (rawUrl.startsWith('/assets/')) {
    return rawUrl;
  }

  return `${baseUrl}/uploads/products/${rawUrl}`;
};

export const getOptimizedImageUrl = (imageData, size = 'medium') => {
  const baseUrl = getImageUrl(imageData);
  if (!baseUrl) return null;

  // Check if already has ImageKit transformations
  if (baseUrl.includes('?tr=') || baseUrl.includes('ik.imagekit.io')) {
    return baseUrl;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  const sizeConfig = {
    thumbnail: 'w-300,h-300,q-70',
    medium: 'w-600,h-600,q-75',
    large: 'w-1000,h-1000,q-80'
  };

  return `${baseUrl}${separator}tr=${sizeConfig[size]},f-auto`;
};

export const getResponsiveSrcSet = (imageData) => {
  const baseUrl = getImageUrl(imageData);
  if (!baseUrl) return '';

  return `
    ${getOptimizedImageUrl(imageData, 'thumbnail')} 300w,
    ${getOptimizedImageUrl(imageData, 'medium')} 600w,
    ${getOptimizedImageUrl(imageData, 'large')} 1000w
  `.trim();
};
