/** @type {import('next').NextConfig} */

// The shared backend. Requests are proxied through the Next server
// (see rewrites below) so the browser never makes a cross-origin call —
// this sidesteps CORS entirely, in dev and in production.
const API_TARGET = process.env.API_PROXY_TARGET || 'https://api.crosscoin.in';

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'placehold.co', 'images.unsplash.com', 'api.crosscoin.in', 'ik.imagekit.io'],
  },
  async rewrites() {
    return [
      { source: '/api/:path*',     destination: `${API_TARGET}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_TARGET}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
