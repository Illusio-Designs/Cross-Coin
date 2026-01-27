/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Image configuration
  images: {
    unoptimized: true,
    domains: ["api.crosscoin.in", "crosscoin.in", "www.crosscoin.in", "localhost"],
  },
  
  // Path aliases
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname, "src"),
    };
    return config;
  },
};

module.exports = nextConfig;