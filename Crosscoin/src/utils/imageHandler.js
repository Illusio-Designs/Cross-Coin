/**
 * Centralized image handling utility
 * Eliminates duplicate image logic across components
 */

export const getImageUrl = (imageData) => {
  if (!imageData) return null;

  let rawUrl = null;
  let transformations = null;

  // Extract URL and transformations from various formats
  if (typeof imageData === 'string') {
    rawUrl = imageData;
  } else if (imageData?.image_url) {
    rawUrl = imageData.image_url;
    transformations = imageData.tr; // Get ImageKit transformations if provided
  } else if (imageData?.url) {
    rawUrl = imageData.url;
    transformations = imageData.tr;
  }

  if (!rawUrl || rawUrl.trim() === '') return null;

  // Handle /assets/ paths - return directly (public folder)
  if (rawUrl.startsWith('/assets/')) {
    return rawUrl;
  }

  // Handle different URL formats
  if (rawUrl.startsWith('http')) {
    // Already a full URL (ImageKit or external)
    if (transformations && !rawUrl.includes('?tr=')) {
      return `${rawUrl}?tr=${transformations}`;
    }
    return rawUrl;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
  const imageKitEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/wp2oatzmf';

  let finalUrl = null;

  if (rawUrl.startsWith('/')) {
    // Check if it's an ImageKit path (/categories, /sliders, /products)
    if (rawUrl.startsWith('/categories') || rawUrl.startsWith('/sliders') || rawUrl.startsWith('/products')) {
      // ImageKit path - prepend ImageKit endpoint
      finalUrl = `${imageKitEndpoint}${rawUrl}`;
    } else {
      // Legacy /uploads/ path - prepend API base URL
      finalUrl = `${baseUrl}${rawUrl}`;
    }
  } else {
    // Legacy: just a filename
    // Check if it's a category image (starts with 'category-')
    if (rawUrl.startsWith('category-')) {
      finalUrl = `${imageKitEndpoint}/categories/${rawUrl}`;
    }
    // Check if it's a slider image (starts with 'slider-')
    else if (rawUrl.startsWith('slider-')) {
      finalUrl = `${imageKitEndpoint}/sliders/${rawUrl}`;
    }
    // Default: assume it's a product image
    else {
      finalUrl = `${imageKitEndpoint}/products/${rawUrl}`;
    }
  }

  // Add transformations if provided
  if (transformations && !finalUrl.includes('?tr=')) {
    finalUrl = `${finalUrl}?tr=${transformations}`;
  }

  return finalUrl;
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
    thumbnail: 'w-200,h-200,q-75',
    medium: 'w-500,h-500,q-80',
    large: 'w-900,h-900,q-82'
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
