import ProductGrid from '@/components/product/ProductGrid'
import { getBestSellers } from '@/lib/products'

export default function BestSellers() {
  const bestSellers = getBestSellers()

  return (
    <section className="py-20 bg-gray-50">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-serif font-bold mb-4">Best Sellers</h2>
          <p className="text-muted text-lg">Our most coveted pieces</p>
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
