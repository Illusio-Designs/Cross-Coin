import ProductGrid from '@/components/product/ProductGrid'

const bestSellers = [
  {
    id: 'premium-athletic-socks',
    name: 'Premium Athletic Socks',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600',
    rating: 4.8,
    reviews: 124,
    badge: 'Best Seller',
  },
  {
    id: 'comfort-casual-pack',
    name: 'Comfort Casual Pack',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=600',
    rating: 4.7,
    reviews: 98,
  },
  {
    id: 'formal-dress-socks',
    name: 'Formal Dress Socks',
    price: 19.99,
    image: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=600',
    hoverImage: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600',
    rating: 4.9,
    reviews: 156,
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
  },
]

export default function BestSellers() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Best Sellers</h2>
          <p className="text-muted text-lg">Our most loved products</p>
        </div>

        <ProductGrid products={bestSellers} />

        <div className="text-center mt-12">
          <a href="/collections/best-sellers" className="btn-primary">
            View All Best Sellers
          </a>
        </div>
      </div>
    </section>
  )
}
