/* Frontend mock data for the Morbix storefront.
   Shapes intentionally mirror what the shared backend returns for the other
   brands, so lib/api.js can swap `USE_MOCK` off with minimal changes later. */

export const heroFeatures = [
  { icon: 'Truck',       title: 'Free shipping',    sub: 'on orders over $50' },
  { icon: 'RefreshCw',   title: 'Easy 14-day returns', sub: 'no questions asked' },
  { icon: 'ShieldCheck', title: 'Authentic products', sub: 'quality guaranteed' },
];

export const categoryChips = [
  { label: 'Running',     icon: 'Activity' },
  { label: 'Athletic',    icon: 'Dumbbell' },
  { label: 'Compression', icon: 'Gauge' },
  { label: 'No-Show',     icon: 'Minus' },
  { label: 'Lifestyle',   icon: 'Sparkles' },
  { label: 'All socks',   icon: 'LayoutGrid' },
];

export const bestsellers = [
  { id: 1, name: 'Morbix Pulse Crew',      category: 'Running socks',     price: 12.9, rating: 4.8, sizes: 'M–XL', badge: null,   image: null },
  { id: 2, name: 'Morbix Ankle Lite',      category: 'Everyday socks',    price: 9.9,  rating: 4.9, sizes: 'S–XL', badge: 'new',  image: null },
  { id: 3, name: 'Morbix City Flow',       category: 'Lifestyle socks',   price: 13.9, rating: 4.7, sizes: 'M–L',  badge: null,   image: null },
  { id: 4, name: 'Morbix Arch Pro',        category: 'Compression socks', price: 16.9, rating: 4.8, sizes: 'M–XL', badge: null,   image: null },
  { id: 5, name: 'Morbix Merino No-Show',  category: 'Lifestyle socks',   price: 14.9, oldPrice: 18.9, rating: 4.8, sizes: 'S–L', badge: 'sale', image: null },
];

export const categoryBanners = [
  { title: 'Running',     text: 'Cushioned, breathable support for every kilometre.',        image: null },
  { title: 'Athletic',    text: 'Grip and stability for training and the court.',             image: null },
  { title: 'Compression', text: 'Graduated support that keeps legs fresh all day.',           image: null },
  { title: 'Lifestyle',   text: 'Soft merino everyday styles that finish the look.',          image: null },
];

export const technologies = [
  { icon: 'Layers',    name: 'CUSHION FOAM',  text: 'Targeted padding at heel and toe' },
  { icon: 'Wind',      name: 'BREATH MESH',   text: 'Ventilated knit keeps feet dry' },
  { icon: 'Footprints',name: 'GRIP KNIT',     text: 'Anti-slip zones stay put in shoes' },
  { icon: 'Move',      name: 'FLEX MOTION',   text: 'Flex zones for natural movement' },
  { icon: 'Heart',     name: 'ARCH SUPPORT',  text: 'Compression band cradles the arch' },
  { icon: 'Leaf',      name: 'ECO COTTON',    text: 'Organic fibres, kinder to the planet' },
];

export const clubPerks = [
  { title: '5% cashback',   sub: 'on every order' },
  { title: 'Early access',  sub: 'to new drops' },
  { title: 'Members deals', sub: 'exclusive prices' },
  { title: 'Birthday gift', sub: 'a little surprise' },
];
