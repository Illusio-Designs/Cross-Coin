/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  // Webpack configuration for development
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: false,
        ignored: ['**/.git/**', '**/node_modules/**', '**/.next/**'],
      };
    }
    
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname, "src"),
    };
    
    return config;
  },
  
  // Image configuration
  images: {
    unoptimized: false,
    domains: ["api.crosscoin.in", "crosscoin.in", "www.crosscoin.in", "localhost"],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.crosscoin.in',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
      {
        protocol: 'https',
        hostname: 'crosscoin.in',
      },
      {
        protocol: 'https',
        hostname: 'www.crosscoin.in',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimized images for a year. Sources are ImageKit URLs (already
    // content-addressed/immutable) so there's no risk of a stale image, and
    // this stops Next from re-optimizing the same image every 60s.
    minimumCacheTTL: 31536000,
  },
  
  compress: true,
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Security headers
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          // CSP header — allow the analytics/marketing trackers we mount in
          // src/components/common/Analytics.jsx (FB Pixel, GA4, Clarity).
          // Without these origins the inline init runs but the external
          // library never loads, so Meta Pixel Helper reports the pixel as
          // "installed but hasn't fired" and GA receives zero hits.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Tracker libraries are served from their own CDNs.
              // Razorpay Checkout / Magic Checkout is served from checkout.razorpay.com
              // (+ *.razorpay.com for its sub-scripts). Without these the payment
              // script is blocked by CSP → "Failed to load Razorpay script" and
              // prepaid checkout can't open.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://connect.facebook.net https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://*.clarity.ms https://*.msg91.com https://checkout.razorpay.com https://*.razorpay.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Tracking beacons (1x1 pixels) and FB / GA pixel images.
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              // Razorpay renders its checkout / Magic modal inside an iframe.
              "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com",
              // Beacon endpoints the trackers POST to.
              // GA4 sends collect beacons to www.google-analytics.com AND (for
              // Google Signals) to analytics.google.com and www.google.com, so
              // all three host forms must be allowed or the hits are refused.
              // stats.g.doubleclick.net is GA4's Google Signals / remarketing
              // beacon (demographics + audiences); without it those features
              // are refused even though basic page_view hits succeed.
              "connect-src 'self' https://api.crosscoin.in https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://www.google.com https://*.googletagmanager.com https://stats.g.doubleclick.net https://*.g.doubleclick.net https://www.facebook.com https://connect.facebook.net https://*.clarity.ms https://*.msg91.com https://*.razorpay.com https://lumberjack.razorpay.com",
              "frame-ancestors 'none'",
            ].join('; ') + ';'
          },
        ],
      },
    ];
  },

  // Redirects for old URLs
  async redirects() {
    return [
      // Thank-you page renamed to the kebab-case slug convention (/thank-you).
      // Keep the old /ThankYou path working — it's used by the backend
      // payment-success redirect and any existing links. Query params such as
      // ?order_number=… are preserved automatically on redirect.
      {
        source: '/ThankYou',
        destination: '/thank-you',
        permanent: true,
      },
      // Legacy product URL (/ProductDetails?slug=foo) → clean slug URL.
      // 301 (permanent: true) consolidates link equity for SEO and tells
      // Google to drop the query-string version from the index.
      {
        source: '/ProductDetails',
        has: [{ type: 'query', key: 'slug', value: '(?<slug>.+)' }],
        destination: '/products/:slug',
        permanent: true,
      },
      // Legacy blog detail URL → clean /journal/<slug>.
      {
        source: '/blog-details',
        has: [{ type: 'query', key: 'slug', value: '(?<slug>.+)' }],
        destination: '/journal/:slug',
        permanent: true,
      },
      // Journal was formerly served at /blog — keep old links + indexed URLs
      // working by 301-ing the listing and every post to their /journal path.
      {
        source: '/blog',
        destination: '/journal',
        permanent: true,
      },
      {
        source: '/blog/:slug*',
        destination: '/journal/:slug*',
        permanent: true,
      },
      // Legacy collection URL filtered via /Products?category=X →
      // /collections/<slug>. We can only redirect when the query value
      // already matches a slug-style string (lowercase, hyphens). For
      // older URLs that have URL-encoded category *names* there's no
      // safe single redirect — those land on /Products which still
      // works via its existing filter.
      {
        source: '/Products',
        has: [{ type: 'query', key: 'category', value: '(?<slug>[a-z0-9-]+)' }],
        destination: '/collections/:slug',
        permanent: true,
      },
      // Legacy policy URL /policy?name=privacy-policy → /policy/privacy-policy.
      // Backend still matches the slug against the title for either form,
      // but the slug URL is what we want indexed.
      {
        source: '/policy',
        has: [{ type: 'query', key: 'name', value: '(?<slug>[a-z0-9-]+)' }],
        destination: '/policy/:slug',
        permanent: true,
      },
    ];
  },

  // Performance: Enable SWC minification
  swcMinify: true,

  // Export static pages when possible
  staticPageGenerationTimeout: 120,

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in',
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['react-icons', 'lucide-react'],
  },
};

module.exports = nextConfig;