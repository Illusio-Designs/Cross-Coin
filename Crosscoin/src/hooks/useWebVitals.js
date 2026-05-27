import { useEffect } from 'react';
import { monitoringService } from '../utils/monitoring';

export const useWebVitals = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || !('web-vital' in window)) {
      // Fallback: use PerformanceObserver
      initWebVitalsMonitoring();
    }
  }, []);

  return null;
};

const initWebVitalsMonitoring = () => {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      const lcp = lastEntry.renderTime || lastEntry.loadTime;
      
      monitoringService.logMetric('LCP', lcp, {
        element: lastEntry.element?.tagName,
        rating: lcp < 2500 ? 'good' : lcp < 4000 ? 'needs-improvement' : 'poor',
      });
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('LCP monitoring unavailable');
  }

  try {
    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        const fid = entry.processingDuration;
        monitoringService.logMetric('FID', fid, {
          name: entry.name,
          rating: fid < 100 ? 'good' : fid < 300 ? 'needs-improvement' : 'poor',
        });
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  } catch (e) {
    console.warn('FID monitoring unavailable');
  }

  try {
    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          monitoringService.logMetric('CLS', clsValue, {
            rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
          });
        }
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    console.warn('CLS monitoring unavailable');
  }

  // Time to First Byte (TTFB)
  if (performance && performance.timing) {
    const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
    monitoringService.logMetric('TTFB', ttfb, {
      rating: ttfb < 600 ? 'good' : ttfb < 1800 ? 'needs-improvement' : 'poor',
    });
  }
};

export default useWebVitals;
