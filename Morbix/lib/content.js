/* Static, presentational site content for the Morbix storefront.
 *
 * This is NOT product/catalog data — it is fixed marketing copy that is part
 * of the page design (hero trust badges, the technology feature grid). All
 * commerce data (products, reviews, blogs, categories) comes live from the
 * backend via lib/api.js.
 */

export const heroFeatures = [
  { icon: 'Truck', title: 'Free shipping', sub: 'on qualifying orders' },
  { icon: 'RefreshCw', title: 'Easy 14-day returns', sub: 'no questions asked' },
  { icon: 'ShieldCheck', title: 'Authentic products', sub: 'quality guaranteed' },
];

export const technologies = [
  { icon: 'Layers', name: 'CUSHION FOAM', text: 'Targeted padding at heel and toe' },
  { icon: 'Wind', name: 'BREATH MESH', text: 'Ventilated knit keeps feet dry' },
  { icon: 'Footprints', name: 'GRIP KNIT', text: 'Anti-slip zones stay put in shoes' },
  { icon: 'Move', name: 'FLEX MOTION', text: 'Flex zones for natural movement' },
  { icon: 'Heart', name: 'ARCH SUPPORT', text: 'Compression band cradles the arch' },
  { icon: 'Leaf', name: 'ECO COTTON', text: 'Organic fibres, kinder to the planet' },
];
