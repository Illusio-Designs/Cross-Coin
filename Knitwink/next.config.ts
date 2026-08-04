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
  // Packages that DO NOT get bundled into the SSR chunk and are loaded
  // via Node's require() at runtime. Two reasons we need this list:
  //
  //   isomorphic-dompurify — pulls jsdom (a large native-ish graph)
  //     on the server. Turbopack tries to inline-bundle the chain
  //     into the SSR chunk and hits a TDZ ('Cannot access X before
  //     initialization') during static prerender. Externalising it
  //     keeps jsdom out of the SSR chunk entirely.
  //
  //   @sentry/nextjs — heavy SDK that wraps Node hooks at load time;
  //     bundling into the SSR chunk has caused init-order issues in
  //     past Next versions and we only ever import it lazily anyway.
  //
  // Symptom that drove this: build crashed at "Generating static pages
  // (0/27)" on /about and /_not-found with a TDZ in the minified SSR
  // chunk. Externalising removes the symptom AND is the documented
  // Next.js path for packages that resist bundling.
  serverExternalPackages: ['isomorphic-dompurify', '@sentry/nextjs'],

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