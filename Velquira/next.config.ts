import type { NextConfig } from 'next'

// Bundle analyzer — `npm run analyze` flips ANALYZE=true and wraps
// the config. Loaded lazily so production builds without the
// package installed still work.
const withBundleAnalyzer = (cfg: NextConfig): NextConfig => {
  if (process.env.ANALYZE !== 'true') return cfg
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analyzer = require('@next/bundle-analyzer')({ enabled: true })
    return analyzer(cfg)
  } catch {
    return cfg
  }
}

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

export default withBundleAnalyzer(nextConfig)
