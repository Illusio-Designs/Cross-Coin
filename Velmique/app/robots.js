const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://velmique.co.in';

const DISALLOW = ['/account', '/cart', '/checkout', '/order-confirmation', '/api/', '/_next/'];
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
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
