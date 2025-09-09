import { useEffect } from 'react';
import Head from 'next/head';

const PerformanceOptimizer = () => {
  useEffect(() => {
    // Preload critical resources
    const preloadResources = () => {
      // Preload critical images
      const criticalImages = [
        '/assets/crosscoin_logo.webp',
        '/assets/hero-bg.webp',
        '/assets/summer.webp'
      ];

      criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      });

      // Preload critical fonts
      const fontLink = document.createElement('link');
      fontLink.rel = 'preload';
      fontLink.as = 'font';
      fontLink.type = 'font/woff2';
      fontLink.crossOrigin = 'anonymous';
      fontLink.href = 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2';
      document.head.appendChild(fontLink);

      // Preconnect to external domains
      const preconnectDomains = [
        'https://api.crosscoin.in',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com'
      ];

      preconnectDomains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        document.head.appendChild(link);
      });

      // DNS prefetch for additional domains
      const dnsPrefetchDomains = [
        'https://cdn.jsdelivr.net',
        'https://unpkg.com'
      ];

      dnsPrefetchDomains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        document.head.appendChild(link);
      });
    };

    // Lazy load images
    const lazyLoadImages = () => {
      const images = document.querySelectorAll('img[data-src]');
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('loading-skeleton');
            img.classList.add('content-visible');
            observer.unobserve(img);
          }
        });
      });

      images.forEach(img => {
        img.classList.add('loading-skeleton');
        imageObserver.observe(img);
      });
    };

    // Initialize performance optimizations
    preloadResources();
    lazyLoadImages();

    // Add loading states
    const addLoadingStates = () => {
      const content = document.querySelector('.content-hidden');
      if (content) {
        setTimeout(() => {
          content.classList.remove('content-hidden');
          content.classList.add('content-visible');
        }, 100);
      }
    };

    addLoadingStates();

    // Cleanup
    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <Head>
      {/* Critical CSS inlined */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Critical CSS for instant loading */
          * { box-sizing: border-box; }
          html { font-size: 16px; line-height: 1.5; -webkit-text-size-adjust: 100%; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #ffffff; color: #000000; }
          .loading-skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: loading 1.5s infinite; }
          @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          img { max-width: 100%; height: auto; display: block; }
          .content-hidden { opacity: 0; transition: opacity 0.3s ease-in-out; }
          .content-visible { opacity: 1; }
          .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
          .grid { display: grid; gap: 1rem; }
          .grid-2 { grid-template-columns: repeat(2, 1fr); }
          .grid-3 { grid-template-columns: repeat(3, 1fr); }
          .grid-4 { grid-template-columns: repeat(4, 1fr); }
          @media (max-width: 768px) { .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; } }
        `
      }} />
      
      {/* Resource hints */}
      <link rel="preconnect" href="https://api.crosscoin.in" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      <link rel="dns-prefetch" href="https://unpkg.com" />
      
      {/* Preload critical images */}
      <link rel="preload" as="image" href="/assets/crosscoin_logo.webp" />
      <link rel="preload" as="image" href="/assets/hero-bg.webp" />
      <link rel="preload" as="image" href="/assets/summer.webp" />
      
      {/* Preload critical fonts */}
      <link rel="preload" as="font" type="font/woff2" href="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2" crossOrigin="anonymous" />
      
      {/* Performance hints */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#ffffff" />
    </Head>
  );
};

export default PerformanceOptimizer;
