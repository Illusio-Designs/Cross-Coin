// lib/data.ts - Velmique Perfume Brand Data

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  collection: string;
  gender: 'Men' | 'Women' | 'Unisex';
  images: string[];
  description: string;
  details: string[];
  sizes?: string[];
  rating: number;
  reviews: number;
  badge?: 'New' | 'Sale' | 'Bestseller' | 'Limited';
  inStock: boolean;
  slug: string;
}

export interface Collection {
  id: string;
  name: string;
  tagline: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  date: string;
  category: string;
  readTime: number;
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Noir Absolu',
    price: 289,
    originalPrice: 380,
    category: 'Eau de Parfum',
    collection: 'Noir',
    gender: 'Unisex',
    images: [
      'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80',
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
    ],
    description: 'A dark, magnetic composition of black oud, smoked vetiver, and midnight rose. Noir Absolu is the scent of power — worn by those who leave a room unforgettable.',
    details: ['Top: Black pepper, Bergamot', 'Heart: Midnight rose, Oud', 'Base: Smoked vetiver, Ambergris', '50ml / 100ml', 'Concentration: Eau de Parfum'],
    sizes: ['30ml', '50ml', '100ml'],
    rating: 4.9,
    reviews: 248,
    badge: 'Sale',
    inStock: true,
    slug: 'noir-absolu',
  },
  {
    id: '2',
    name: 'Velvet Oud',
    price: 245,
    category: 'Eau de Parfum',
    collection: 'Signature',
    gender: 'Men',
    images: [
      'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&q=80',
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
    ],
    description: 'Rich Arabian oud wrapped in velvety sandalwood and warm amber. A timeless oriental fragrance that deepens with every hour on skin.',
    details: ['Top: Saffron, Cardamom', 'Heart: Rose, Oud', 'Base: Sandalwood, Amber, Musk', '50ml / 100ml', 'Concentration: Eau de Parfum'],
    sizes: ['30ml', '50ml', '100ml'],
    rating: 4.8,
    reviews: 189,
    badge: 'Bestseller',
    inStock: true,
    slug: 'velvet-oud',
  },
  {
    id: '3',
    name: 'Lumière Dorée',
    price: 195,
    category: 'Eau de Parfum',
    collection: 'Luminara',
    gender: 'Women',
    images: [
      'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=800&q=80',
      'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80',
    ],
    description: 'A radiant floral-citrus fragrance inspired by golden Mediterranean afternoons. Neroli, jasmine, and warm musk create an aura of effortless luminosity.',
    details: ['Top: Neroli, Bergamot, Lemon', 'Heart: Jasmine, Ylang-ylang', 'Base: White musk, Cedarwood', '50ml / 100ml', 'Concentration: Eau de Parfum'],
    sizes: ['30ml', '50ml', '100ml'],
    rating: 4.7,
    reviews: 134,
    badge: 'New',
    inStock: true,
    slug: 'lumiere-doree',
  },
  {
    id: '4',
    name: 'Obsidian Rose',
    price: 215,
    category: 'Eau de Parfum',
    collection: 'Signature',
    gender: 'Women',
    images: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
      'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=800&q=80',
    ],
    description: 'A modern rose reimagined — dark, smoky, and intoxicating. Bulgarian rose absolute meets black pepper and patchouli for a scent that defies convention.',
    details: ['Top: Black pepper, Pink grapefruit', 'Heart: Bulgarian rose, Iris', 'Base: Patchouli, Oakmoss, Musk', '50ml / 100ml', 'Concentration: Eau de Parfum'],
    sizes: ['30ml', '50ml', '100ml'],
    rating: 4.6,
    reviews: 312,
    badge: 'Bestseller',
    inStock: true,
    slug: 'obsidian-rose',
  },
  {
    id: '5',
    name: 'Phantom Encens',
    price: 395,
    category: 'Extrait de Parfum',
    collection: 'Noir',
    gender: 'Men',
    images: [
      'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&q=80',
      'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80',
    ],
    description: 'Our most intense creation. Sacred frankincense, labdanum, and dark woods compose a fragrance of rare depth and extraordinary longevity.',
    details: ['Top: Frankincense, Elemi', 'Heart: Labdanum, Cistus', 'Base: Dark woods, Benzoin, Vanilla', '50ml only', 'Concentration: Extrait de Parfum'],
    sizes: ['50ml'],
    rating: 4.9,
    reviews: 87,
    badge: 'Limited',
    inStock: true,
    slug: 'phantom-encens',
  },
  {
    id: '6',
    name: 'Lumière Blanche',
    price: 165,
    originalPrice: 210,
    category: 'Eau de Toilette',
    collection: 'Luminara',
    gender: 'Women',
    images: [
      'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=800&q=80',
      'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&q=80',
    ],
    description: 'A clean, airy white floral — the scent of freshly laundered linen and sun-warmed skin. Light, elegant, and endlessly wearable.',
    details: ['Top: Aldehydes, Peach', 'Heart: White lily, Magnolia', 'Base: White musk, Cashmere wood', '50ml / 100ml', 'Concentration: Eau de Toilette'],
    sizes: ['30ml', '50ml', '100ml'],
    rating: 4.5,
    reviews: 156,
    badge: 'Sale',
    inStock: true,
    slug: 'lumiere-blanche',
  },
  {
    id: '7',
    name: 'Céleste Ambre',
    price: 235,
    category: 'Eau de Parfum',
    collection: 'Luminara',
    gender: 'Unisex',
    images: [
      'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80',
      'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=800&q=80',
    ],
    description: 'Warm amber and vanilla entwined with exotic spices. A sensual, enveloping fragrance that feels like a second skin — intimate and unforgettable.',
    details: ['Top: Cinnamon, Clove', 'Heart: Amber, Benzoin', 'Base: Vanilla, Tonka bean, Musk', '50ml / 100ml', 'Concentration: Eau de Parfum'],
    sizes: ['30ml', '50ml', '100ml'],
    rating: 4.8,
    reviews: 203,
    badge: 'New',
    inStock: true,
    slug: 'celeste-ambre',
  },
  {
    id: '8',
    name: 'Sovereign Iris',
    price: 445,
    category: 'Extrait de Parfum',
    collection: 'Signature',
    gender: 'Unisex',
    images: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
      'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&q=80',
    ],
    description: 'The pinnacle of Velmique artistry. Rare orris root from Florence, aged for three years, forms the heart of this extraordinary extrait — powdery, noble, and utterly unique.',
    details: ['Top: Violet leaf, Aldehydes', 'Heart: Orris root, Iris pallida', 'Base: Vetiver, White cedar, Musk', '50ml only', 'Concentration: Extrait de Parfum'],
    sizes: ['50ml'],
    rating: 5.0,
    reviews: 64,
    badge: 'Limited',
    inStock: true,
    slug: 'sovereign-iris',
  },
];

export const collections: Collection[] = [
  {
    id: '1',
    name: 'Noir',
    tagline: 'Darkness distilled',
    slug: 'noir',
    description: 'Dark, magnetic, and deeply sensual. Fragrances for those who command every room.',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80',
    productCount: 8,
  },
  {
    id: '2',
    name: 'Signature',
    tagline: 'Your timeless mark',
    slug: 'signature',
    description: 'Timeless compositions that define the Velmique identity — refined, bold, unforgettable.',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
    productCount: 12,
  },
  {
    id: '3',
    name: 'Luminara',
    tagline: 'Radiance in a bottle',
    slug: 'luminara',
    description: 'Radiant, luminous scents inspired by golden light and Mediterranean warmth.',
    image: 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=800&q=80',
    productCount: 9,
  },
  {
    id: '4',
    name: 'Extrait',
    tagline: 'Pure concentration',
    slug: 'extrait',
    description: 'Our most concentrated, rare creations — for those who demand the extraordinary.',
    image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&q=80',
    productCount: 5,
  },
  {
    id: '5',
    name: 'Tribute',
    tagline: 'Celebrate you',
    slug: 'tribute',
    description: 'Fragrances crafted as an ode to life\'s most meaningful moments.',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80',
    productCount: 6,
  },
];

export const discoveryKits = [
  {
    id: 'dk1',
    name: 'Noir Discovery Kit',
    price: 89,
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80',
    slug: 'noir-discovery-kit',
    includes: '5 × 2ml samples',
  },
  {
    id: 'dk2',
    name: 'Luminara Discovery Kit',
    price: 89,
    image: 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600&q=80',
    slug: 'luminara-discovery-kit',
    includes: '5 × 2ml samples',
  },
];

export const shopTheLooks = [
  {
    id: 'stl1',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
    products: ['Noir Absolu', 'Phantom Encens'],
    slugs: ['noir-absolu', 'phantom-encens'],
  },
  {
    id: 'stl2',
    image: 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=800&q=80',
    products: ['Lumière Dorée', 'Obsidian Rose'],
    slugs: ['lumiere-doree', 'obsidian-rose'],
  },
];

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'The Art of Wearing Perfume: A Velmique Guide',
    slug: 'art-of-wearing-perfume',
    excerpt: 'Discover how the right fragrance transforms not just your scent, but your entire presence — and how to make it last all day.',
    content: '',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80',
    author: 'Isabelle Moreau',
    date: 'March 12, 2026',
    category: 'Guide',
    readTime: 5,
  },
  {
    id: '2',
    title: 'Behind the Bottle: Our Commitment to Ethical Perfumery',
    slug: 'behind-the-bottle-ethical-perfumery',
    excerpt: 'Every Velmique fragrance tells a story of craftsmanship, sustainable sourcing, and respect for the master perfumers who create them.',
    content: '',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
    author: 'Sophie Laurent',
    date: 'March 5, 2026',
    category: 'Brand',
    readTime: 7,
  },
  {
    id: '3',
    title: 'Luminara 2026: A Love Letter to Golden Light',
    slug: 'luminara-collection-2026',
    excerpt: 'Inspired by late evenings on the Mediterranean coast, our Luminara collection captures the warmth of golden hour in every drop.',
    content: '',
    image: 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=800&q=80',
    author: 'Camille Dubois',
    date: 'February 28, 2026',
    category: 'Collections',
    readTime: 4,
  },
  {
    id: '4',
    title: 'How to Layer Fragrances: 5 Velmique Combinations',
    slug: 'how-to-layer-fragrances',
    excerpt: 'Fragrance layering is an art. Here are five Velmique combinations that create something entirely your own.',
    content: '',
    image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&q=80',
    author: 'Isabelle Moreau',
    date: 'February 20, 2026',
    category: 'Guide',
    readTime: 3,
  },
];

export const testimonials = [
  {
    id: '1',
    name: 'Alexandra V.',
    location: 'Paris, France',
    text: 'Noir Absolu is unlike anything I have ever worn. It evolves on my skin throughout the day — dark and mysterious in the morning, warm and sensual by evening.',
    rating: 5,
    product: 'Noir Absolu',
  },
  {
    id: '2',
    name: 'Mariana S.',
    location: 'Milan, Italy',
    text: 'I wore Phantom Encens to three events and received compliments every single time. People kept asking what I was wearing. Worth every penny.',
    rating: 5,
    product: 'Phantom Encens',
  },
  {
    id: '3',
    name: 'Priya K.',
    location: 'London, UK',
    text: 'Sovereign Iris is the most beautiful iris fragrance I have ever encountered. The depth and longevity are extraordinary — it lasts well over 12 hours.',
    rating: 5,
    product: 'Sovereign Iris',
  },
  {
    id: '4',
    name: 'Elena R.',
    location: 'New York, USA',
    text: 'Velvet Oud has become my signature scent. Velmique\'s attention to ingredient quality is evident from the first spray — rich, complex, and utterly addictive.',
    rating: 5,
    product: 'Velvet Oud',
  },
];

export const categories = ['All', 'Eau de Parfum', 'Extrait de Parfum', 'Eau de Toilette', 'Gift Sets', 'Discovery Sets'];
