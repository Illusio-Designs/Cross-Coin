/**
 * Build a clean collection URL from a category object or name string.
 *
 *   collectionUrl({ slug: 'wireless-earphones', name: 'Wireless Earphones' })
 *     → '/collections/wireless-earphones'
 *
 *   collectionUrl('Cross Coin® Professional Performance Ankle Socks')
 *     → '/collections/cross-coin-professional-performance-ankle-socks'
 *
 * Preserves a single canonical URL pattern across the storefront so we
 * stop emitting URL-encoded category-name query strings like
 * /Products?category=Cross%20Coin%C2%AE%20Professional… — those rank
 * badly and look bad in shared links.
 */
export function collectionUrl(input) {
  if (!input) return '/Collections';
  // Already a category object with a slug.
  if (typeof input === 'object' && input.slug) {
    return `/collections/${input.slug}`;
  }
  const name = typeof input === 'string' ? input : (input.name || '');
  return `/collections/${slugify(name)}`;
}

/**
 * Frontend mirror of the backend slug rule (slugify with lower: true,
 * strict). Strips registered/trademark symbols and all non-ASCII
 * punctuation so the URL is friendly to crawlers and users.
 */
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // drop combining diacritics
    .replace(/[®™©]/g, '')           // drop common trademark glyphs
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')     // any other run of non-alnum → single hyphen
    .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens
}
