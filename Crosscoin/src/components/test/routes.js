// Canonical live storefront URLs for the Mint design.
//
// During the cutover the Mint pages/components link through this map instead of
// hardcoding /test/* paths, so the same components render correctly both at the
// /test/* preview and at the real routes. These are the existing indexed URLs
// (see next.config redirects + the old header nav), so promoting Mint to the
// live site keeps every URL, backlink and feed entry intact.
export const R = {
  home: '/',
  shop: '/products',
  collections: '/collections',
  collection: (slug) => `/collections/${encodeURIComponent(slug)}`,
  product: (slug) => `/products/${encodeURIComponent(slug)}`,
  cart: '/cart',
  wishlist: '/wishlist',
  search: '/search',
  track: '/track-order',
  account: '/profile',
  login: '/login',
  register: '/register',
  returns: '/returns',
  contact: '/contact',
  about: '/about',
  journal: '/journal',
  blog: (slug) => `/journal/${encodeURIComponent(slug)}`,
  policy: (slug) => `/policy/${encodeURIComponent(slug)}`,
  thankYou: '/thank-you',
};

// Shop URL with an optional category: a slug-style category goes straight to
// its clean /collections/<slug> page; anything else uses the /products filter.
export const shopUrl = (cat) => {
  if (!cat) return R.shop;
  return /^[a-z0-9-]+$/.test(String(cat)) ? R.collection(cat) : `${R.shop}?category=${encodeURIComponent(cat)}`;
};
