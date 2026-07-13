/**
 * robots.txt for Knitwink. Allows full crawl on the public storefront,
 * blocks the account / cart / checkout flow so private URLs don't end
 * up indexed.
 */

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com';

const DISALLOW = [
  '/account',
  '/account/',
  '/cart',
  '/checkout',
  '/order-confirmation',
  '/login',
  '/register',
  '/api/',
];
// AI crawlers we explicitly allow. Each needs its own rule repeating the
// private-path disallows, because a crawler obeys only its most-specific group.
const AI_BOTS = ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'];

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
