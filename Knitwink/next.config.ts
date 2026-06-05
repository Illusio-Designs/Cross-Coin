import type { NextConfig } from 'next'

// Bundle analyzer — enabled when ANALYZE=true. Outputs an HTML report
// under .next/analyze/ that visualises what's actually in each chunk.
// Wrap NextConfig at the bottom of this file via `withBundleAnalyzer`.
// Lazy require so prod builds don't pull the package even though it's
// in devDependencies.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
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
