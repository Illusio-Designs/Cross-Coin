/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'plus.unsplash.com'],
    remotePatterns: [
      { protocol: 'https', hostname: 'ik.imagekit.io' },
      { protocol: 'https', hostname: 'api.crosscoin.in' },
      { protocol: 'https', hostname: 'crosscoin.in' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  compress: true,
  poweredByHeader: false,
  // Keep more dev pages in memory so HMR doesn't evict and 404 chunks
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 8,
  },
  async headers() {
    if (isDev) {
      // In dev, never let the browser hold onto stale HTML/JS that references
      // chunks the dev server has already rebuilt with new hashes.
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'Cache-Control', value: 'no-store, must-revalidate' },
            { key: 'Pragma', value: 'no-cache' },
          ],
        },
      ];
    }
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        source: '/(.*)\\.(jpg|jpeg|png|webp|avif|svg|ico)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
}

// Bundle analyzer — run `npm run analyze` to inspect output.
if (process.env.ANALYZE === 'true') {
  try {
    // eslint-disable-next-line global-require
    const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
    module.exports = withBundleAnalyzer(nextConfig);
  } catch {
    // @next/bundle-analyzer not installed — fall back silently
    module.exports = nextConfig;
  }
} else {
  module.exports = nextConfig;
}
