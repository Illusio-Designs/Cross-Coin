// lib/data.ts - Mock data for Velmique e-commerce

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  collection: string;
  images: string[];
  description: string;
  details: string[];
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  rating: number;
  reviews: number;
  badge?: 'New' | 'Sale' | 'Bestseller' | 'Limited';
  inStock: boolean;
  slug: string;
}

export interface Collection {
  id: string;
  name: string;
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
    name: 'Noir Élégance Gown',
    price: 289,
    originalPrice: 420,
    category: 'Dresses',
    collection: 'Evening',
    images: [
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
    ],
    description: 'A masterpiece of evening wear, the Noir Élégance Gown drapes the body in liquid silk. Designed for the woman who commands every room she enters.',
    details: ['100% Silk', 'Dry clean only', 'Imported', 'Hidden zip closure', 'Fully lined'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Midnight Black', hex: '#111' }, { name: 'Deep Burgundy', hex: '#4A0E0E' }],
    rating: 4.9,
    reviews: 124,
    badge: 'Sale',
    inStock: true,
    slug: 'noir-elegance-gown',
  },
  {
    id: '2',
    name: 'Velvet Reverie Blazer',
    price: 195,
    category: 'Outerwear',
    collection: 'Signature',
    images: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4b4571?w=800&q=80',
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80',
    ],
    description: 'Structured yet sensual. This velvet blazer redefines power dressing with its luxurious texture and impeccable tailoring.',
    details: ['80% Velvet, 20% Polyester', 'Dry clean only', 'Padded shoulders', 'Single button closure'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Obsidian', hex: '#1a1a1a' }, { name: 'Forest', hex: '#1B3A2D' }, { name: 'Wine', hex: '#722F37' }],
    rating: 4.8,
    reviews: 89,
    badge: 'Bestseller',
    inStock: true,
    slug: 'velvet-reverie-blazer',
  },
  {
    id: '3',
    name: 'Gold Drape Midi Dress',
    price: 175,
    category: 'Dresses',
    collection: 'Luminara',
    images: [
      'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
    ],
    description: 'Shimmering gold-threaded fabric that catches every light. A statement piece for unforgettable moments.',
    details: ['Metallic woven fabric', 'Hand wash cold', 'Midi length', 'Side slit'],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [{ name: 'Gold', hex: '#C9A84C' }, { name: 'Silver', hex: '#C0C0C0' }],
    rating: 4.7,
    reviews: 62,
    badge: 'New',
    inStock: true,
    slug: 'gold-drape-midi-dress',
  },
  {
    id: '4',
    name: 'Obsidian Silk Blouse',
    price: 145,
    category: 'Tops',
    collection: 'Signature',
    images: [
      'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=800&q=80',
      'https://images.unsplash.com/photo-1559563458-527698bf5295?w=800&q=80',
    ],
    description: 'Pure silk luxury meets modern minimalism. A wardrobe essential crafted for effortless sophistication.',
    details: ['100% Mulberry Silk', 'Dry clean only', 'Button-down front', 'Relaxed fit'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Black', hex: '#111' }, { name: 'Ivory', hex: '#FFFFF0' }, { name: 'Blush', hex: '#FFB6C1' }],
    rating: 4.6,
    reviews: 198,
    badge: 'Bestseller',
    inStock: true,
    slug: 'obsidian-silk-blouse',
  },
  {
    id: '5',
    name: 'Phantom Trench Coat',
    price: 395,
    category: 'Outerwear',
    collection: 'Evening',
    images: [
      'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=800&q=80',
      'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=800&q=80',
    ],
    description: 'An architectural masterwork. The Phantom Trench reshapes the classic silhouette with dramatic proportions and theatrical presence.',
    details: ['Wool blend', 'Dry clean only', 'Double breasted', 'Belt included', 'Fully lined'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: [{ name: 'Charcoal', hex: '#36454F' }, { name: 'Camel', hex: '#C19A6B' }],
    rating: 4.9,
    reviews: 45,
    badge: 'Limited',
    inStock: true,
    slug: 'phantom-trench-coat',
  },
  {
    id: '6',
    name: 'Lumière Satin Skirt',
    price: 125,
    originalPrice: 165,
    category: 'Bottoms',
    collection: 'Luminara',
    images: [
      'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=800&q=80',
      'https://images.unsplash.com/photo-1524374975-5e886f3a0f31?w=800&q=80',
    ],
    description: 'Floor-grazing satin that flows like water. Effortless elegance for day-to-night dressing.',
    details: ['100% Satin', 'Hand wash', 'Elastic waistband', 'Midi length with front slit'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Champagne', hex: '#F7E7CE' }, { name: 'Onyx', hex: '#353839' }, { name: 'Ruby', hex: '#9B111E' }],
    rating: 4.5,
    reviews: 77,
    badge: 'Sale',
    inStock: true,
    slug: 'lumiere-satin-skirt',
  },
  {
    id: '7',
    name: 'Celestial Wrap Dress',
    price: 215,
    category: 'Dresses',
    collection: 'Luminara',
    images: [
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80',
      'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=800&q=80',
    ],
    description: 'A versatile wrap silhouette rendered in our signature Celestial print. Worn dressed up or down, it never fails to captivate.',
    details: ['Printed chiffon', 'Hand wash', 'Self-tie waist', 'V-neckline'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Midnight', hex: '#191970' }, { name: 'Emerald', hex: '#50C878' }],
    rating: 4.8,
    reviews: 156,
    badge: 'New',
    inStock: true,
    slug: 'celestial-wrap-dress',
  },
  {
    id: '8',
    name: 'Sovereign Leather Jacket',
    price: 445,
    category: 'Outerwear',
    collection: 'Signature',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
      'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=800&q=80',
    ],
    description: 'Genuine Italian leather with gold hardware. The Sovereign is the ultimate investment piece — gets better with every wear.',
    details: ['100% Genuine leather', 'Professional clean only', 'Gold-tone hardware', 'Interior pockets'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Noir', hex: '#0a0a0a' }, { name: 'Cognac', hex: '#834333' }],
    rating: 5.0,
    reviews: 33,
    badge: 'Limited',
    inStock: true,
    slug: 'sovereign-leather-jacket',
  },
];

export const collections: Collection[] = [
  {
    id: '1',
    name: 'Evening',
    slug: 'evening',
    description: 'Crafted for moments that matter. Our Evening collection defines luxury after dark.',
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80',
    productCount: 18,
  },
  {
    id: '2',
    name: 'Signature',
    slug: 'signature',
    description: 'Timeless pieces that form the foundation of an extraordinary wardrobe.',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4571?w=800&q=80',
    productCount: 24,
  },
  {
    id: '3',
    name: 'Luminara',
    slug: 'luminara',
    description: 'Radiant fabrics and luminous hues for those who refuse to be ordinary.',
    image: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&q=80',
    productCount: 15,
  },
  {
    id: '4',
    name: 'Noir',
    slug: 'noir',
    description: 'The power of darkness distilled into wearable art.',
    image: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=800&q=80',
    productCount: 20,
  },
];

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'The Art of Dressing for Power: A Velmique Guide',
    slug: 'art-of-dressing-for-power',
    excerpt: 'Discover how the right ensemble transforms not just your appearance, but your entire presence in a room.',
    content: '',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80',
    author: 'Isabelle Moreau',
    date: 'March 12, 2026',
    category: 'Style',
    readTime: 5,
  },
  {
    id: '2',
    title: 'Behind the Fabric: Our Commitment to Ethical Luxury',
    slug: 'behind-the-fabric-ethical-luxury',
    excerpt: 'Every Velmique piece tells a story of craftsmanship, sustainability, and respect for the makers.',
    content: '',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    author: 'Sophie Laurent',
    date: 'March 5, 2026',
    category: 'Brand',
    readTime: 7,
  },
  {
    id: '3',
    title: 'Spring/Summer 2026: The Luminara Collection Story',
    slug: 'luminara-collection-2026',
    excerpt: 'Inspired by late evenings on the Mediterranean, our newest collection is a love letter to golden light.',
    content: '',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
    author: 'Camille Dubois',
    date: 'February 28, 2026',
    category: 'Collections',
    readTime: 4,
  },
  {
    id: '4',
    title: 'How to Style the Velvet Blazer: 5 Looks',
    slug: 'style-velvet-blazer-5-looks',
    excerpt: 'Our bestselling Velvet Reverie Blazer is the definition of versatility. Here are five ways to make it your own.',
    content: '',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4571?w=800&q=80',
    author: 'Isabelle Moreau',
    date: 'February 20, 2026',
    category: 'Style',
    readTime: 3,
  },
];

export const testimonials = [
  {
    id: '1',
    name: 'Alexandra V.',
    location: 'Paris, France',
    text: 'Velmique transformed how I think about dressing. Each piece feels like it was made specifically for me — the quality is extraordinary.',
    rating: 5,
    product: 'Noir Élégance Gown',
  },
  {
    id: '2',
    name: 'Mariana S.',
    location: 'Milan, Italy',
    text: 'I wore the Phantom Trench to three events in a row and got compliments every single time. Worth every penny and more.',
    rating: 5,
    product: 'Phantom Trench Coat',
  },
  {
    id: '3',
    name: 'Priya K.',
    location: 'London, UK',
    text: 'The silk blouse is unbelievably soft. Velmique\'s attention to detail is evident from the packaging to the final stitch.',
    rating: 5,
    product: 'Obsidian Silk Blouse',
  },
  {
    id: '4',
    name: 'Elena R.',
    location: 'New York, USA',
    text: 'Finally, a luxury brand that actually delivers on its promise. The Velvet Blazer has become my signature piece.',
    rating: 5,
    product: 'Velvet Reverie Blazer',
  },
];

export const categories = ['All', 'Dresses', 'Tops', 'Outerwear', 'Bottoms', 'Accessories'];
