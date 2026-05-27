// Image optimization utilities for responsive images

export const generateResponsiveImageSrcSet = (baseUrl, sizes = [320, 640, 1024, 1920]) => {
  if (!baseUrl) return '';
  if (baseUrl.includes('?')) {
    const [url, params] = baseUrl.split('?');
    return sizes.map(size => `${url}?w=${size}&${params} ${size}w`).join(', ');
  }
  return sizes.map(size => `${baseUrl}?w=${size} ${size}w`).join(', ');
};

export const generateSizesAttribute = () => {
  return ['(max-width: 640px) 100vw', '(max-width: 1024px) 50vw', '(max-width: 1920px) 33vw', '25vw'].join(', ');
};

export const optimizeImageUrl = (url, options = {}) => {
  const { width = null, height = null, quality = 80, format = 'webp', fit = 'cover' } = options;
  if (!url) return '';
  
  if (url.includes('?')) {
    const params = new URLSearchParams(url.split('?')[1]);
    if (width) params.set('w', width);
    if (height) params.set('h', height);
    params.set('q', quality);
    params.set('f', format);
    params.set('fit', fit);
    return url.split('?')[0] + '?' + params.toString();
  }
  
  const params = new URLSearchParams();
  if (width) params.set('w', width);
  if (height) params.set('h', height);
  params.set('q', quality);
  params.set('f', format);
  params.set('fit', fit);
  return `${url}?${params.toString()}`;
};

export const preloadImage = (url) => {
  if (typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  link.imagesrcset = generateResponsiveImageSrcSet(url);
  link.imagesizes = generateSizesAttribute();
  document.head.appendChild(link);
};

export const prefetchImage = (url) => {
  if (typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
};

export const getImageDimensions = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

export const calculateAspectRatio = (width, height) => {
  if (!width || !height) return null;
  return (height / width * 100).toFixed(2) + '%';
};

export const getOptimalImageSize = (containerWidth, dpi = 2) => {
  const sizes = [320, 640, 1024, 1920];
  const targetWidth = containerWidth * dpi;
  const optimal = sizes.find(size => size >= targetWidth);
  return optimal || sizes[sizes.length - 1];
};

export const generatePlaceholder = (width = 10, height = 10, color = '#e5e7eb') => {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="${color}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const batchLoadImages = async (urls, onProgress = null) => {
  const results = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          results.push({ url: urls[i], success: true });
          if (onProgress) onProgress({ loaded: i + 1, total: urls.length });
          resolve();
        };
        img.onerror = () => {
          results.push({ url: urls[i], success: false });
          if (onProgress) onProgress({ loaded: i + 1, total: urls.length });
          reject(new Error(`Failed to load: ${urls[i]}`));
        };
        img.src = urls[i];
      });
    } catch (e) {}
  }
  return results;
};

export const trackImageLoadingMetrics = () => {
  if (typeof PerformanceObserver === 'undefined') return;
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {}
  
  try {
    const resourceObserver = new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach(entry => {
        if (entry.name.match(/\.(jpg|jpeg|png|webp|svg)$/i)) {
          const loadTime = entry.responseEnd - entry.fetchStart;
          if (loadTime > 1000) console.warn(`Slow image: ${entry.name} (${loadTime}ms)`);
        }
      });
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
  } catch (e) {}
};

export default {
  generateResponsiveImageSrcSet,
  generateSizesAttribute,
  optimizeImageUrl,
  preloadImage,
  prefetchImage,
  getImageDimensions,
  calculateAspectRatio,
  getOptimalImageSize,
  generatePlaceholder,
  batchLoadImages,
  trackImageLoadingMetrics,
};
