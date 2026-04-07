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
    minimumCacheTTL: 60,
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
    ];
  },
};

module.exports = nextConfig;