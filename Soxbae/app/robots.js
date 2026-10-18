/**
 * robots.txt for Soxbae. Allows full crawl on the public storefront,
 * blocks the account / cart / checkout flow so private URLs don't end
 * up indexed.
 */

// Must match layout.jsx metadataBase so the Sitemap: line points at the
// canonical host (crawlers were sent to the non-www sitemap, which redirects).
const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://soxbae.com';

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
      // Google Shopping / Merchant Center crawls product pages as "Googlebot"
      // and product images as "Googlebot-Image"; name them explicitly so
      // Merchant Center's "quality & policy checks" pass.
      { userAgent: 'Googlebot', allow: '/', disallow: DISALLOW },
      { userAgent: 'Googlebot-Image', allow: '/' },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
