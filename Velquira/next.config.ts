import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Single-process page-data collection. The multi-worker collector
  // races with the editor / AV file-watcher on Windows and throws
  // intermittent "Cannot find module for page" errors; one worker is
  // deterministic and avoids that.
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.CDN_HOSTNAME ?? 'cdn.allbirds.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
      {
        protocol: 'https',
        hostname: 'api.crosscoin.in',
      },
    ],
  },
}

export default nextConfig
