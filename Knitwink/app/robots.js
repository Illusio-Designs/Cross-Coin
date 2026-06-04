/**
 * robots.txt for Knitwink. Allows full crawl on the public storefront,
 * blocks the account / cart / checkout flow so private URLs don't end
 * up indexed.
 */

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/account/',
          '/cart',
          '/checkout',
          '/order-confirmation',
          '/login',
          '/register',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
