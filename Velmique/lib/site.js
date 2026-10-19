/* Site-wide constants shared by metadata, JSON-LD, sitemap and robots.
   One canonical host so every canonical / OG / sitemap URL agrees. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://velmique.co.in').replace(/\/+$/, '');

/** Absolute URL for a site path ('/shop' → 'https://…/shop'). */
export const absUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

/** Next metadata fragment: canonical + og:url for a path. */
export const canonical = (path) => ({
  alternates: { canonical: absUrl(path) },
});
