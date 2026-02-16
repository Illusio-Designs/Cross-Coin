/**
 * Image optimization utilities
 * Helper functions for Next.js Image component
 */

/**
 * Get responsive sizes string for Next.js Image
 * @param {string} type - 'product', 'thumbnail', 'hero', 'icon'
 * @returns {string} sizes attribute value
 */
export function getImageSizes(type) {
  const sizeMap = {
    hero: '100vw',
    product: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    thumbnail: '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 150px',
    icon: '64px',
    full: '100vw',
  };
  
  return sizeMap[type] || '100vw';
}

/**
 * Get image dimensions based on type
 * @param {string} type - 'product', 'thumbnail', 'hero'
 * @returns {object} { width, height }
 */
export function getImageDimensions(type) {
  const dimensionMap = {
    hero: { width: 1920, height: 1080 },
    product: { width: 800, height: 800 },
    thumbnail: { width: 150, height: 150 },
    icon: { width: 64, height: 64 },
    card: { width: 400, height: 400 },
  };
  
  return dimensionMap[type] || { width: 800, height: 800 };
}

/**
 * Get image quality based on type
 * @param {string} type - 'product', 'thumbnail', 'hero'
 * @returns {number} quality (1-100)
 */
export function getImageQuality(type) {
  const qualityMap = {
    hero: 85,
    product: 75,
    thumbnail: 70,
    icon: 80,
  };
  
  return qualityMap[type] || 75;
}

/**
 * Check if image should be priority loaded
 * @param {number} index - Image index in list
 * @param {boolean} isAboveFold - Is image above the fold
 * @returns {boolean}
 */
export function shouldPrioritizeImage(index, isAboveFold = false) {
  // Prioritize first 2-3 images or images above fold
  return isAboveFold || index < 3;
}

/**
 * Get optimized image props for Next.js Image
 * @param {object} options
 * @returns {object} Props for Next.js Image component
 */
export function getOptimizedImageProps({
  type = 'product',
  index = 0,
  isAboveFold = false,
  customWidth,
  customHeight,
  customQuality,
}) {
  const dimensions = getImageDimensions(type);
  
  return {
    width: customWidth || dimensions.width,
    height: customHeight || dimensions.height,
    quality: customQuality || getImageQuality(type),
    sizes: getImageSizes(type),
    priority: shouldPrioritizeImage(index, isAboveFold),
    loading: shouldPrioritizeImage(index, isAboveFold) ? 'eager' : 'lazy',
  };
}

/**
 * Placeholder blur data URL
 * @returns {string} Base64 encoded blur placeholder
 */
export function getBlurDataURL() {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==';
}

/**
 * Example usage:
 * 
 * import Image from 'next/image';
 * import { getOptimizedImageProps } from '@/utils/imageOptimization';
 * 
 * // In component:
 * <Image
 *   src={productImage}
 *   alt="Product"
 *   {...getOptimizedImageProps({ type: 'product', index: 0, isAboveFold: true })}
 * />
 */
