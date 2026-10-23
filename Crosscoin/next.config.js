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
          // NOTE: no Content-Security-Policy is set here, by design.
          // CrossCoin was the ONLY storefront shipping a strict CSP; the
          // other stores (Morbix, Soxbae, …) ship none, so third-party
          // widgets load freely there. The allowlist kept blocking those
          // same widgets on CrossCoin — the MSG91 OTP/WhatsApp SSE channel
          // (its Cloud Run host), the Facebook cookie-sync iframe, and
          // Razorpay Checkout's blob: worker — so it was removed to match
          // the other stores. If a CSP is re-added, it must carry the full
          // third-party allowlist (see git history for the last version).
        ],
      },
    ];
  },

  // Redirects for old URLs
  async redirects() {
    return [
      // Mint cutover: the homepage is now served at /. The legacy /home route
      // (old design) is retired — 301 it to the canonical root.
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
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
      // Mint cutover: catch the BARE legacy routes (no query → old design)
      // AFTER their slug variants above, so the old pages are never served.
      {
        source: '/ProductDetails',
        destination: '/products',
        permanent: true,
      },
      {
        source: '/blog-details',
        destination: '/journal',
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
      // Collection filtered via /products?category=X (or the old /Products) →
      // /collections/<slug>. We can only redirect when the query value
      // already matches a slug-style string (lowercase, hyphens). For
      // older URLs that have URL-encoded category *names* there's no
      // safe single redirect — those land on /products which still
      // works via its existing filter.
      {
        source: '/products',
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
      // Bare /policy (old page retired) → the privacy policy by default.
      {
        source: '/policy',
        destination: '/policy/privacy-policy',
        permanent: false,
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
    // Inline above-the-fold CSS and defer the rest — fixes the render-blocking
    // 63 KiB global stylesheet (only ~10 KiB is used above the fold on the
    // homepage). Uses critters/beasties under the hood.
    optimizeCss: true,
    optimizePackageImports: ['react-icons', 'lucide-react'],
  },
};

module.exports = nextConfig;