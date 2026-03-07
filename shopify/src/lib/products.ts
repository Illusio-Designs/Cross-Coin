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
  sizes?: string[]
  colors?: string[]
}

export const products: Product[] = [
  {
    id: 'premium-athletic-socks',
    name: 'Premium Athletic Socks',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600',
    rating: 4.8,
    reviews: 124,
    badge: 'Best Seller',
    description: 'High-performance athletic socks with moisture-wicking technology',
    category: 'athletic',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'White', 'Gray', 'Navy'],
  },
  {
    id: 'comfort-casual-pack',
    name: 'Comfort Casual Pack',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=600',
    rating: 4.7,
    reviews: 98,
    description: 'Everyday comfort socks perfect for casual wear',
    category: 'casual',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'White', 'Gray', 'Brown'],
  },
  {
    id: 'formal-dress-socks',
    name: 'Formal Dress Socks',
    price: 19.99,
    image: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600',
    rating: 4.9,
    reviews: 156,
    description: 'Elegant dress socks for professional occasions',
    category: 'formal',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'Navy', 'Gray', 'Brown'],
  },
  {
    id: 'winter-wool-socks',
    name: 'Winter Wool Socks',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
    rating: 4.6,
    reviews: 87,
    badge: 'New',
    description: 'Warm wool socks for cold weather',
    category: 'winter',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'Gray', 'Brown', 'Navy'],
  },
  {
    id: 'compression-sport-socks',
    name: 'Compression Sport Socks',
    price: 27.99,
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600',
    rating: 4.5,
    reviews: 65,
    description: 'Compression socks for enhanced performance',
    category: 'athletic',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'White', 'Blue', 'Red'],
  },
  {
    id: 'no-show-ankle-socks',
    name: 'No-Show Ankle Socks',
    price: 16.99,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
    rating: 4.4,
    reviews: 92,
    description: 'Invisible comfort for low-cut shoes',
    category: 'casual',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'White', 'Beige', 'Gray'],
  },
  {
    id: 'merino-wool-hiking',
    name: 'Merino Wool Hiking Socks',
    price: 39.99,
    image: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=600',
    rating: 4.9,
    reviews: 143,
    badge: 'Premium',
    description: 'Premium merino wool for outdoor adventures',
    category: 'athletic',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Gray', 'Brown', 'Green', 'Black'],
  },
  {
    id: 'cotton-crew-basics',
    name: 'Cotton Crew Basics',
    price: 22.99,
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600',
    rating: 4.6,
    reviews: 78,
    description: 'Classic cotton crew socks for everyday wear',
    category: 'casual',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'White', 'Gray', 'Navy'],
  },
]

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category)
}

export function getBestSellers(): Product[] {
  return products.filter((p) => p.badge === 'Best Seller' || p.rating >= 4.7)
}
