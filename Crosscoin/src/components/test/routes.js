// Canonical live storefront URLs for the Mint design.
//
// During the cutover the Mint pages/components link through this map instead of
// hardcoding /test/* paths, so the same components render correctly both at the
// /test/* preview and at the real routes. These are the existing indexed URLs
// (see next.config redirects + the old header nav), so promoting Mint to the
// live site keeps every URL, backlink and feed entry intact.
export const R = {
  home: '/',
  shop: '/Products',
  collections: '/Collections',
  collection: (slug) => `/collections/${encodeURIComponent(slug)}`,
  product: (slug) => `/products/${encodeURIComponent(slug)}`,
  cart: '/cart',
  wishlist: '/Wishlist',
  search: '/SearchResults',
  track: '/OrderTracking',
  account: '/profile',
  login: '/login',
  register: '/register',
  returns: '/returns',
  contact: '/Contact',
  about: '/About',
  journal: '/journal',
  blog: (slug) => `/journal/${encodeURIComponent(slug)}`,
  policy: (slug) => `/policy/${encodeURIComponent(slug)}`,
  thankYou: '/thank-you',
};

// Build a shop URL with an optional category filter (?category= is what the
// real /Products route reads, and the next.config redirect maps a slug-style
// value to /collections/<slug>).
export const shopUrl = (cat) => (cat ? `${R.shop}?category=${encodeURIComponent(cat)}` : R.shop);
