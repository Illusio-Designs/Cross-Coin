import { SITE_URL as SITE } from '@/lib/site';

// Private / transactional pages (also noindex in their metadata). The retired
// /test preview is NOT disallowed: crawlers must see its 301s to the root.
const DISALLOW = ['/account', '/cart', '/checkout', '/order-confirmation', '/wishlist', '/login', '/register', '/search', '/api/', '/_next/'];
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
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
