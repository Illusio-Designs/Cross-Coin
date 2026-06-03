export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Velquira';

export const SHIPPING_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD ?? 50000
);

export const ROUTES = {
  home: '/',
  collections: '/collections',
  products: '/products',
  product: (handle) => `/products/${handle}`,
  cart: '/cart',
  account: '/account',
  orders: '/account/orders',
  order: (id) => `/account/orders/${id}`,
  login: '/login',
  register: '/register',
  about: '/about',
  journal: '/journal',
  contact: '/contact',
  search: '/search',
  wishlist: '/wishlist',
  trackOrder: '/track-order',
};

export const NAV_LINKS = [
  { label: 'Collections', href: '/collections' },
  { label: 'Products', href: '/products' },
  { label: 'About', href: '/about' },
  { label: 'Lustre', href: '/journal' },
];

// Fine-jewellery categories — clicking one applies a category filter on
// the PRODUCTS page (not the collections page).
export const JEWELLERY_CATEGORIES = [
  { label: 'Rings', href: '/products?category=Rings' },
  { label: 'Necklaces', href: '/products?category=Necklaces' },
  { label: 'Earrings', href: '/products?category=Earrings' },
  { label: 'Bracelets', href: '/products?category=Bracelets' },
  { label: 'Bridal', href: '/products?category=Bridal' },
];
