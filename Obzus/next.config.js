/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The site is a static informative page — no image optimisation service needed.
  images: { unoptimized: true },
};

module.exports = nextConfig;
