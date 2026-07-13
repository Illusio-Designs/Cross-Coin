const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://velquira.com';

const DISALLOW = ['/account', '/cart', '/api/', '/_next/'];
// AI crawlers we explicitly allow. Each needs its own rule repeating the
// private-path disallows, because a crawler obeys only its most-specific group.
const AI_BOTS = ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'];

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
