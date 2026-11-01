/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  // Put the page's CSS inside the HTML instead of separate files: those are
  // requests the browser must download before it can draw anything (page
  // speed: "render-blocking requests").
  experimental: { inlineCss: true },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'ik.imagekit.io' },
      { protocol: 'https', hostname: 'api.crosscoin.in' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;
