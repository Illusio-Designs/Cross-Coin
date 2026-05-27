// Performance optimization utilities

// Lazy load images with Intersection Observer
export const useLazyLoadImage = () => {
  return {
    ref: null,
    options: {
      root: null,
      rootMargin: '50px',
      threshold: 0.01,
    },
    observe: (element) => {
      if (!('IntersectionObserver' in window)) {
        // Fallback: load image immediately if IntersectionObserver not supported
        if (element.dataset.src) {
          element.src = element.dataset.src;
        }
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.add('loaded');
              observer.unobserve(img);
            }
          }
        });
      }, this.options);

      observer.observe(element);
      return observer;
    },
  };
};

// Optimize image: generate srcset for responsive images
export const generateImageSrcSet = (imagePath, sizes = [320, 640, 1024, 1920]) => {
  // For API URLs, add query params
  if (imagePath.startsWith('http') || imagePath.startsWith('/api')) {
    return sizes
      .map(size => `${imagePath}?w=${size} ${size}w`)
      .join(', ');
  }

  // For local images, assume naming convention
  return sizes
    .map(size => {
      const ext = imagePath.split('.').pop();
      const base = imagePath.substring(0, imagePath.lastIndexOf('.'));
      return `${base}-${size}w.${ext} ${size}w`;
    })
    .join(', ');
};

// Debounce function - prevents rapid function calls
export const debounce = (fn, delay = 300) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Throttle function - limits function calls to N per time window
export const throttle = (fn, limit = 1000) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Measure performance timing
export const measurePerformance = (label) => {
  const startTime = performance.now();

  return {
    end: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`${label}: ${duration.toFixed(2)}ms`);
      return duration;
    },
  };
};

// Request idle callback with fallback
export const scheduleIdleCallback = (callback) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1000);
  }
};

// Preload critical resources
export const preloadResource = (href, type = 'script') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = type;
  link.href = href;
  document.head.appendChild(link);
};

// Prefetch non-critical resources
export const prefetchResource = (href) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
};

// Cache API responses in memory
export const memoize = (fn) => {
  const cache = new Map();

  return (...args) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);

    return result;
  };
};

// Batch DOM updates to prevent layout thrashing
export const batchDOMUpdates = (updates) => {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
};

// Monitor Core Web Vitals
export const monitorWebVitals = (callback) => {
  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        callback({
          metric: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP monitoring not available');
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          callback({
            metric: 'FID',
            value: entry.processingDuration,
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID monitoring not available');
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            callback({
              metric: 'CLS',
              value: clsValue,
            });
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS monitoring not available');
    }
  }
};

// Virtual scrolling for large lists
export const createVirtualScroller = (options) => {
  const {
    items = [],
    itemHeight = 50,
    containerHeight = 500,
    renderItem = null,
    buffer = 5,
  } = options;

  return {
    getVisibleRange: (scrollTop) => {
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
      const endIndex = Math.min(
        items.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
      );

      return { startIndex, endIndex };
    },

    renderVisibleItems: (scrollTop) => {
      const { startIndex, endIndex } = this.getVisibleRange(scrollTop);
      const offsetY = startIndex * itemHeight;

      return {
        items: items.slice(startIndex, endIndex),
        offsetY,
        totalHeight: items.length * itemHeight,
      };
    },
  };
};

// Bundle size analysis helper
export const analyzeBundle = () => {
  if (performance && performance.getEntriesByType) {
    const resources = performance.getEntriesByType('resource');
    const scripts = resources.filter(r => r.name.endsWith('.js'));
    const styles = resources.filter(r => r.name.endsWith('.css'));
    const images = resources.filter(r => /\.(jpg|jpeg|png|webp|svg)$/.test(r.name));

    const totalSize = resources.reduce((sum, r) => sum + r.transferSize, 0);

    return {
      totalResources: resources.length,
      scripts: {
        count: scripts.length,
        totalSize: scripts.reduce((sum, r) => sum + r.transferSize, 0),
        items: scripts.map(s => ({
          name: s.name.split('/').pop(),
          size: s.transferSize,
          duration: s.duration,
        })),
      },
      styles: {
        count: styles.length,
        totalSize: styles.reduce((sum, r) => sum + r.transferSize, 0),
      },
      images: {
        count: images.length,
        totalSize: images.reduce((sum, r) => sum + r.transferSize, 0),
      },
      totalSize: Math.round(totalSize / 1024), // Convert to KB
    };
  }

  return null;
};

export default {
  useLazyLoadImage,
  generateImageSrcSet,
  debounce,
  throttle,
  measurePerformance,
  scheduleIdleCallback,
  preloadResource,
  prefetchResource,
  memoize,
  batchDOMUpdates,
  monitorWebVitals,
  createVirtualScroller,
  analyzeBundle,
};
