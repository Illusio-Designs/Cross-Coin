/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons", "lodash"],
    // Enable server components
    serverComponentsExternalPackages: ["axios"],
  },
  // Image configuration - optimized for performance
  images: {
    unoptimized: false, // Enable Next.js image optimization
    domains: ["api.crosscoin.in", "localhost"],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Disable source maps in production for better performance
  productionBrowserSourceMaps: false,
  // Enable compression
  compress: true,
  // Enable SWC minification for better performance
  swcMinify: true,
  // Enable static optimization
  trailingSlash: false,
  // Enable powered by header removal
  poweredByHeader: false,
  // Enable output file tracing for better optimization
  output: "standalone",
  // Configure headers for better security and performance
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Removed preload headers to avoid browser warnings
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Expires",
            value: new Date(Date.now() + 31536000000).toUTCString(),
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Expires",
            value: new Date(Date.now() + 31536000000).toUTCString(),
          },
        ],
      },
      {
        source: "/:path*.(jpg|jpeg|png|gif|ico|svg|webp|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Expires",
            value: new Date(Date.now() + 31536000000).toUTCString(),
          },
        ],
      },
    ];
  },
  // Optimize webpack configuration for maximum speed
  webpack: (config, { dev, isServer }) => {
    // Ensure we're using webpack and not Turbopack
    config.mode = dev ? 'development' : 'production';
    // Optimize production builds
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          minSize: 10000,
          maxSize: 200000,
          minChunks: 1,
          maxAsyncRequests: 20,
          maxInitialRequests: 20,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            common: {
              name: "common",
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              enforce: true,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: "react",
              priority: 20,
              reuseExistingChunk: true,
              enforce: true,
            },
            icons: {
              test: /[\\/]node_modules[\\/](lucide-react|react-icons)[\\/]/,
              name: "icons",
              priority: 15,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
        // Enable module concatenation for better performance
        concatenateModules: true,
        // Enable side effects optimization
        sideEffects: false,
      };
    }

    // Optimize for faster builds
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        // Add aliases for faster resolution
        "@": require("path").resolve(__dirname, "src"),
      },
    };

    // Optimize bundle analyzer
    if (process.env.ANALYZE === "true") {
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          openAnalyzer: false,
        })
      );
    }

    return config;
  },
  // Removed rewrites - using dynamic routing instead
};

module.exports = nextConfig;
