export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Knitwink';

export const SHIPPING_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD ?? 50000
);

export const ROUTES = {
  home: '/',
  collections: '/collections',
  products: '/products',
  product: (handle) => `/products/${handle}`,
  cart: '/cart',
  checkout: '/checkout',
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
  { label: 'Men', href: '/products?category=Men' },
  { label: 'Women', href: '/products?category=Women' },
  { label: 'Sale', href: '/products?category=Sale' },
  { label: 'About', href: '/about' },
  { label: 'Journal', href: '/journal' },
];
