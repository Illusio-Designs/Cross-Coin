const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://velmique.com';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account', '/cart', '/checkout', '/order-confirmation', '/api/', '/_next/'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
