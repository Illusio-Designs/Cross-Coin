/* Frontend mock data for the Morbix storefront.
   Shapes intentionally mirror what the shared backend returns for the other
   brands, so lib/api.js can swap `USE_MOCK` off with minimal changes later. */

export const heroFeatures = [
  { icon: 'Truck',       title: 'Free shipping',    sub: 'on orders over $50' },
  { icon: 'RefreshCw',   title: 'Easy 14-day returns', sub: 'no questions asked' },
  { icon: 'ShieldCheck', title: 'Authentic products', sub: 'quality guaranteed' },
];

export const categoryChips = [
  { label: 'Running',     slug: 'running',     icon: 'Activity' },
  { label: 'Athletic',    slug: 'athletic',    icon: 'Dumbbell' },
  { label: 'Compression', slug: 'compression', icon: 'Gauge' },
  { label: 'No-Show',     slug: 'no-show',     icon: 'Minus' },
  { label: 'Lifestyle',   slug: 'lifestyle',   icon: 'Sparkles' },
  { label: 'All socks',   slug: 'all',         icon: 'LayoutGrid' },
];

const SIZES = ['S', 'M', 'L', 'XL'];

/* Full catalog. `image: null` renders the branded placeholder tile. */
export const products = [
  { id: 1,  slug: 'pulse-crew',        name: 'Morbix Pulse Crew',       category: 'Running',     categorySlug: 'running',     price: 12.9, rating: 4.8, reviews: 214, sizes: SIZES, colors: ['#202c6e', '#2fa39b', '#1b2340'], badge: null,   description: 'A cushioned crew sock engineered for the run — targeted padding at heel and toe, a ventilated mesh top and a snug arch band that keeps it locked in mile after mile.' },
  { id: 2,  slug: 'ankle-lite',        name: 'Morbix Ankle Lite',       category: 'Athletic',    categorySlug: 'athletic',    price: 9.9,  rating: 4.9, reviews: 340, sizes: SIZES, colors: ['#1b2340', '#2fa39b', '#e7f4f2'], badge: 'new',  description: 'Barely-there ankle sock in a breathable knit. Light, fast-drying and low-profile — made for training days and warm-weather miles.' },
  { id: 3,  slug: 'city-flow',         name: 'Morbix City Flow',        category: 'Lifestyle',   categorySlug: 'lifestyle',   price: 13.9, rating: 4.7, reviews: 128, sizes: SIZES, colors: ['#202c6e', '#6a7186', '#1b2340'], badge: null,   description: 'A clean everyday sock that finishes the look. Soft combed cotton, a ribbed cuff that stays up, and a smooth toe seam for all-day comfort.' },
  { id: 4,  slug: 'arch-pro',          name: 'Morbix Arch Pro',         category: 'Compression', categorySlug: 'compression', price: 16.9, rating: 4.8, reviews: 97,  sizes: SIZES, colors: ['#1b2340', '#202c6e'], badge: null,   description: 'Graduated compression that keeps legs fresh through long days and long runs. Firm arch support with a seamless, chafe-free finish.' },
  { id: 5,  slug: 'merino-no-show',    name: 'Morbix Merino No-Show',   category: 'Lifestyle',   categorySlug: 'no-show',     price: 14.9, oldPrice: 18.9, rating: 4.8, reviews: 176, sizes: SIZES, colors: ['#6a7186', '#1b2340', '#2fa39b'], badge: 'sale', description: 'Temperature-regulating merino in an invisible no-show cut. Silky, odour-resistant and grippy at the heel so it never slips into your shoe.' },
  { id: 6,  slug: 'grip-court',        name: 'Morbix Grip Court',       category: 'Athletic',    categorySlug: 'athletic',    price: 13.9, rating: 4.6, reviews: 82,  sizes: SIZES, colors: ['#202c6e', '#2fa39b'], badge: null,   description: 'Court-ready sock with anti-slip grip zones and reinforced high-wear areas. Stability and cushioning for quick stops and hard cuts.' },
  { id: 7,  slug: 'trail-terrain',     name: 'Morbix Trail Terrain',    category: 'Running',     categorySlug: 'running',     price: 15.9, rating: 4.7, reviews: 64,  sizes: SIZES, colors: ['#1b2340', '#2fa39b'], badge: 'new',  description: 'A rugged trail sock with extra cushioning, a protective ankle cuff and moisture-wicking knit built for long days off-road.' },
  { id: 8,  slug: 'daily-crew-3pack',  name: 'Morbix Daily Crew 3-Pack', category: 'Lifestyle',  categorySlug: 'lifestyle',   price: 24.9, rating: 4.9, reviews: 291, sizes: SIZES, colors: ['#1b2340', '#202c6e', '#6a7186'], badge: null, description: 'Three everyday crew socks in a soft cotton blend. The dependable rotation — breathable, durable and endlessly comfortable.' },
  { id: 9,  slug: 'recovery-comp',     name: 'Morbix Recovery Comp',    category: 'Compression', categorySlug: 'compression', price: 18.9, rating: 4.7, reviews: 58,  sizes: SIZES, colors: ['#202c6e', '#1b2340'], badge: null,   description: 'Knee-high recovery compression to boost circulation after training. Graduated support, plush footbed and a stay-put top band.' },
  { id: 10, slug: 'featherweight-run', name: 'Morbix Featherweight Run', category: 'Running',    categorySlug: 'running',     price: 14.9, rating: 4.8, reviews: 133, sizes: SIZES, colors: ['#2fa39b', '#1b2340'], badge: null,   description: 'The lightest sock in the range — a paper-thin performance knit with strategic ventilation for race day and fast efforts.' },
  { id: 11, slug: 'no-show-2pack',     name: 'Morbix No-Show 2-Pack',   category: 'No-Show',     categorySlug: 'no-show',     price: 16.9, rating: 4.6, reviews: 74,  sizes: SIZES, colors: ['#e7f4f2', '#1b2340'], badge: null,  description: 'Two invisible no-show socks with silicone heel grips. Clean lines with any shoe, no slipping, no bunching.' },
  { id: 12, slug: 'wool-lounge',       name: 'Morbix Wool Lounge',      category: 'Lifestyle',   categorySlug: 'lifestyle',   price: 17.9, oldPrice: 21.9, rating: 4.9, reviews: 205, sizes: SIZES, colors: ['#6a7186', '#202c6e'], badge: 'sale', description: 'Cosy brushed-wool lounge socks with a wide, non-binding cuff. The soft landing your feet want at the end of the day.' },
];

/* Enrich every product with spec + feature detail. Kept out of the rows above
   so the base catalog stays readable; values vary a little by category. */
const MATERIAL_BY_CAT = {
  Running:      '74% combed cotton · 22% recycled polyester · 4% elastane',
  Athletic:     '70% performance nylon · 26% cotton · 4% spandex',
  Compression:  '68% nylon · 28% polyester · 4% elastane',
  'No-Show':    '80% combed cotton · 16% polyamide · 4% elastane',
  Lifestyle:    '62% merino wool · 34% cotton · 4% elastane',
};
const FEATURES_BY_CAT = {
  Running:     [['Layers', 'Targeted heel & toe cushioning'], ['Wind', 'Breathable mesh top'], ['Heart', 'Arch-support band'], ['Footprints', 'Seamless toe closure']],
  Athletic:    [['Footprints', 'Anti-slip grip zones'], ['Move', 'Flex zones for quick cuts'], ['Wind', 'Moisture-wicking knit'], ['Layers', 'Reinforced high-wear areas']],
  Compression: [['Heart', 'Graduated compression'], ['Layers', 'Plush cushioned footbed'], ['Move', 'Stay-put top band'], ['Wind', 'Breathable ventilation']],
  'No-Show':   [['Footprints', 'Silicone heel grip'], ['Wind', 'Low-profile breathable knit'], ['Layers', 'Cushioned sole'], ['Leaf', 'Odour-resistant fibres']],
  Lifestyle:   [['Leaf', 'Temperature-regulating merino'], ['Layers', 'Soft brushed footbed'], ['Move', 'Non-binding cuff'], ['Wind', 'Naturally breathable']],
};
products.forEach((p, i) => {
  p.sku = `MRB-${p.slug.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
  p.material = MATERIAL_BY_CAT[p.category] || '78% cotton · 18% polyester · 4% elastane';
  p.care = 'Machine wash cold, inside out · Tumble dry low · Do not bleach';
  p.fit = 'True to size';
  p.cushioning = p.category === 'Compression' ? 'Firm support'
    : p.category === 'Running' ? 'Medium'
    : p.category === 'Lifestyle' ? 'Plush' : 'Light';
  p.origin = 'Ethically made';
  p.features = (FEATURES_BY_CAT[p.category] || FEATURES_BY_CAT.Running)
    .map(([icon, text]) => ({ icon, text }));
});

/* A small pool of customer reviews the product page samples from. */
export const reviews = [
  { author: 'Alex P.',   rating: 5, date: 'Mar 2025', title: 'My new everyday pair',  text: 'Incredibly comfortable — the cushioning is spot on and they stay up all day. Ordered three more pairs.' },
  { author: 'Jordan M.', rating: 5, date: 'Feb 2025', title: 'Great for running',     text: 'No blisters on my long runs, breathable and they wash really well. Highly recommend.' },
  { author: 'Sam R.',    rating: 4, date: 'Feb 2025', title: 'Soft and durable',      text: 'Good quality knit that held up after many washes. Sizing is accurate.' },
  { author: 'Priya K.',  rating: 5, date: 'Jan 2025', title: 'Love the fit',          text: 'The arch-support band actually makes a difference on long days. Will buy again.' },
  { author: 'Chris T.',  rating: 4, date: 'Jan 2025', title: 'Solid value',           text: 'Comfortable and well made. Would love a few more colour options.' },
];

/* Homepage bestsellers = a curated slice of the catalog. */
export const bestsellers = [products[0], products[1], products[2], products[3], products[4]];

export const categoryBanners = [
  { title: 'Running',     slug: 'running',     text: 'Cushioned, breathable support for every kilometre.', image: null },
  { title: 'Athletic',    slug: 'athletic',    text: 'Grip and stability for training and the court.',      image: null },
  { title: 'Compression', slug: 'compression', text: 'Graduated support that keeps legs fresh all day.',     image: null },
  { title: 'Lifestyle',   slug: 'lifestyle',   text: 'Soft everyday styles that finish the look.',          image: null },
];

export const technologies = [
  { icon: 'Layers',    name: 'CUSHION FOAM',  text: 'Targeted padding at heel and toe' },
  { icon: 'Wind',      name: 'BREATH MESH',   text: 'Ventilated knit keeps feet dry' },
  { icon: 'Footprints',name: 'GRIP KNIT',     text: 'Anti-slip zones stay put in shoes' },
  { icon: 'Move',      name: 'FLEX MOTION',   text: 'Flex zones for natural movement' },
  { icon: 'Heart',     name: 'ARCH SUPPORT',  text: 'Compression band cradles the arch' },
  { icon: 'Leaf',      name: 'ECO COTTON',    text: 'Organic fibres, kinder to the planet' },
];

export const blogPosts = [
  { slug: 'choose-running-socks', category: 'Guides',     date: 'Mar 2025', title: 'How to choose the right running sock', excerpt: 'Cushioning, cut and fabric — the three things that actually matter when you pick a sock for the run.' },
  { slug: 'science-of-cushioning', category: 'Technology', date: 'Feb 2025', title: 'The science behind targeted cushioning', excerpt: 'Why padding at the heel and toe changes everything, and how we knit it in without the bulk.' },
  { slug: 'make-socks-last',       category: 'Care',       date: 'Jan 2025', title: '5 ways to make your socks last longer', excerpt: 'A few small habits that keep your favourite pairs feeling new, wash after wash.' },
];

export const clubPerks = [
  { title: '5% cashback',   sub: 'on every order' },
  { title: 'Early access',  sub: 'to new drops' },
  { title: 'Members deals', sub: 'exclusive prices' },
  { title: 'Birthday gift', sub: 'a little surprise' },
];
