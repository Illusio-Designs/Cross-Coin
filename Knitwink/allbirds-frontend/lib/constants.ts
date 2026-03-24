export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Allbirds'

export const SHIPPING_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD ?? 75000
)

export const ROUTES = {
  home: '/',
  collections: '/collections',
  collection: (handle: string) => `/collections/${handle}`,
  product: (handle: string) => `/products/${handle}`,
  cart: '/cart',
  checkout: '/checkout',
  account: '/account',
  orders: '/account/orders',
  order: (id: string) => `/account/orders/${id}`,
  settings: '/account/settings',
  login: '/login',
  register: '/register',
  about: '/about',
  sustainability: '/sustainability',
  quiz: '/quiz',
  search: '/search',
  wishlist: '/wishlist',
  journal: '/journal',
  contact: '/contact',
  sizeGuide: '/size-guide',
} as const

export const NAV_LINKS = [
  { label: 'Men', href: '/collections/mens' },
  { label: 'Women', href: '/collections/womens' },
  { label: 'Sale', href: '/collections/sale' },
  { label: 'About', href: '/about' },
  { label: 'ReRun', href: '/rerun' },
  { label: 'Sustainability', href: '/sustainability' },
] as const
