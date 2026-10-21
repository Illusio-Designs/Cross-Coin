/**
 * robots.txt for Morbix. Allows full crawl on the public storefront,
 * blocks the account / cart / checkout flow so private URLs don't end
 * up indexed.
 */

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://morbixsocks.com';

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
// OpenAI uses three: GPTBot (training), OAI-SearchBot (ChatGPT search) and
// ChatGPT-User (pages a ChatGPT user asks it to open).
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'];

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
    host: SITE_URL.replace(/^https?:\/\//, '').replace(/\/.*$/, ''), // Host: takes the domain only
  };
}
