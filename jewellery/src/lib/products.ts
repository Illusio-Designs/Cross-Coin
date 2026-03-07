export interface Product {
  id: string
  name: string
  price: number
  image: string
  hoverImage?: string
  rating: number
  reviews: number
  badge?: string
  description?: string
  category?: string
  materials?: string[]
  sizes?: string[]
}

export const products: Product[] = [
  {
    id: 'diamond-solitaire-ring',
    name: 'Diamond Solitaire Ring',
    price: 2499.99,
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600',
    rating: 4.9,
    reviews: 234,
    badge: 'Best Seller',
    description: 'Exquisite 1.5 carat diamond solitaire ring in 18K white gold',
    category: 'rings',
    materials: ['18K White Gold', '18K Yellow Gold', 'Platinum'],
    sizes: ['5', '6', '7', '8', '9'],
  },
  {
    id: 'pearl-necklace',
    name: 'Tahitian Pearl Necklace',
    price: 3299.99,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600',
    rating: 4.8,
    reviews: 156,
    description: 'Lustrous Tahitian pearls with 18K gold clasp',
    category: 'necklaces',
    materials: ['18K Yellow Gold', '18K White Gold'],
  },
  {
    id: 'emerald-earrings',
    name: 'Emerald Drop Earrings',
    price: 1899.99,
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600',
    rating: 4.7,
    reviews: 98,
    badge: 'New',
    description: 'Stunning emerald drop earrings with diamond accents',
    category: 'earrings',
    materials: ['18K Yellow Gold', '18K White Gold'],
  },
  {
    id: 'tennis-bracelet',
    name: 'Diamond Tennis Bracelet',
    price: 4599.99,
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600',
    rating: 4.9,
    reviews: 187,
    description: 'Classic diamond tennis bracelet with 5 carats total weight',
    category: 'bracelets',
    materials: ['18K White Gold', 'Platinum'],
    sizes: ['6.5"', '7"', '7.5"', '8"'],
  },
  {
    id: 'sapphire-ring',
    name: 'Blue Sapphire Ring',
    price: 2799.99,
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600',
    rating: 4.8,
    reviews: 143,
    badge: 'Premium',
    description: 'Royal blue sapphire surrounded by diamonds',
    category: 'rings',
    materials: ['18K White Gold', '18K Yellow Gold', 'Platinum'],
    sizes: ['5', '6', '7', '8', '9'],
  },
  {
    id: 'gold-chain-necklace',
    name: 'Gold Chain Necklace',
    price: 1299.99,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600',
    rating: 4.6,
    reviews: 211,
    description: 'Elegant 18K gold chain necklace',
    category: 'necklaces',
    materials: ['18K Yellow Gold', '18K Rose Gold'],
  },
  {
    id: 'diamond-studs',
    name: 'Diamond Stud Earrings',
    price: 1599.99,
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600',
    rating: 4.9,
    reviews: 298,
    description: 'Timeless diamond stud earrings, 1 carat total weight',
    category: 'earrings',
    materials: ['18K White Gold', '18K Yellow Gold', 'Platinum'],
  },
  {
    id: 'luxury-watch',
    name: 'Swiss Luxury Watch',
    price: 8999.99,
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600',
    rating: 4.9,
    reviews: 87,
    badge: 'Exclusive',
    description: 'Swiss-made automatic watch with diamond bezel',
    category: 'watches',
    materials: ['18K Yellow Gold', 'Stainless Steel'],
  },
]

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category)
}

export function getBestSellers(): Product[] {
  return products.filter((p) => p.badge === 'Best Seller' || p.rating >= 4.8)
}
