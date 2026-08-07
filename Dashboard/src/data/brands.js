/**
 * Obzus brand portfolio — single source of truth for the brand grid and the
 * per-brand detail pages (/brands/[slug]).
 *
 * Edit copy freely. `blurb` = short line on cards; `about` = paragraphs on the
 * brand page; `highlights` = the three bullets. Logos live in /public/brands.
 */
export const BRANDS = [
  {
    slug: 'crosscoin',
    name: 'CrossCoin',
    logo: '/brands/crosscoin.webp',
    url: 'https://crosscoin.in',
    category: 'Socks',
    blurb: 'Everyday lifestyle essentials with a bold, modern edge.',
    about: [
      'CrossCoin is a lifestyle brand built around everyday essentials — pieces designed to be worn on repeat, made to look good and last longer.',
      'The range blends comfort with a clean, contemporary aesthetic, giving customers dependable staples that fit effortlessly into daily life.',
    ],
    highlights: ['Everyday lifestyle staples', 'Modern, minimal aesthetic', 'Comfort-first materials'],
  },
  {
    slug: 'gripzus',
    name: 'Gripzus',
    logo: '/brands/gripzus.jpeg',
    url: 'https://gripzus.com',
    category: 'Socks',
    blurb: 'Performance-minded products for people always on the move.',
    about: [
      'Gripzus is built for everyday performance — products engineered to keep up with an active, on-the-go lifestyle.',
      'Function leads the design, with a focus on durability, grip and reliability so the gear works as hard as the people using it.',
    ],
    highlights: ['Built for active use', 'Durable and dependable', 'Function-first design'],
  },
  {
    slug: 'morbix',
    name: 'Morbix',
    logo: '/brands/morbix.png',
    url: 'https://morbixsocks.com',
    category: 'Socks',
    blurb: 'Comfortable, colourful socks and everyday basics.',
    about: [
      'Morbix makes socks and everyday basics that add a little colour and a lot of comfort to the daily routine.',
      'Soft, breathable and made to last wash after wash, Morbix is the easy upgrade to an everyday essential.',
    ],
    highlights: ['Soft, breathable knits', 'Playful colourways', 'Built to last'],
  },
  {
    slug: 'soxbae',
    name: 'Soxbae',
    logo: '/brands/soxbae.png',
    url: 'https://soxbaesocks.com',
    category: 'Socks',
    blurb: 'Happiness in feet — socks that feel as good as they look.',
    about: [
      'Soxbae is all about happiness in feet — socks designed to keep you comfortable from the first step to the last.',
      'With cushioned comfort and designs worth showing off, Soxbae turns an everyday basic into something you actually look forward to putting on.',
    ],
    highlights: ['Cushioned all-day comfort', 'Designs worth showing off', 'Everyday value'],
  },
  {
    slug: 'knitwink',
    name: 'Knitwink',
    logo: '/brands/knitwink.webp',
    url: 'https://knitwink.com',
    category: 'Socks',
    blurb: 'Luxury in every step — elevated, finely knit essentials.',
    about: [
      'Knitwink brings luxury to every step, with finely knit essentials that feel premium and look refined.',
      'Careful craftsmanship and quality yarns make Knitwink the considered choice for those who notice the details.',
    ],
    highlights: ['Finely knit craftsmanship', 'Premium yarns', 'Refined, elevated finish'],
  },
  {
    slug: 'velmique',
    name: 'Velmique',
    logo: '/brands/velmique.webp',
    url: 'https://velmique.co.in',
    category: 'Perfume',
    blurb: 'Refined, modern pieces with an understated elegance.',
    about: [
      'Velmique is a refined, modern brand built on understated elegance — pieces that feel considered without trying too hard.',
      'A restrained palette and clean silhouettes give the range a timeless quality that works far beyond a single season.',
    ],
    highlights: ['Understated elegance', 'Clean, timeless silhouettes', 'Considered detailing'],
  },
  {
    slug: 'velquira',
    name: 'Velquira',
    logo: '/brands/velquira.png',
    url: 'https://velquira.in',
    category: 'Considered design',
    blurb: 'Considered design with a warm, premium sensibility.',
    about: [
      'Velquira is built around considered design — a warm, premium sensibility expressed through every product.',
      'Thoughtful materials and a distinctive identity give the brand a character that stands apart while staying effortlessly wearable.',
    ],
    highlights: ['Premium, warm aesthetic', 'Distinctive brand identity', 'Thoughtful materials'],
  },
];

export const getBrand = (slug) => BRANDS.find((b) => b.slug === slug) || null;
