import Link from 'next/link';

const products = [
  {
    id: 1,
    name: 'Pro Grip Elite',
    category: 'Professional',
    price: 49.99,
    image: '/placeholder1',
  },
  {
    id: 2,
    name: 'Gaming Master Grip',
    category: 'Gaming',
    price: 39.99,
    image: '/placeholder2',
  },
  {
    id: 3,
    name: 'Athletic Performance',
    category: 'Sports',
    price: 44.99,
    image: '/placeholder3',
  },
  {
    id: 4,
    name: 'Tool Grip Pro',
    category: 'Industrial',
    price: 54.99,
    image: '/placeholder4',
  },
];

export default function FeaturedProducts() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <span className="text-xs lg:text-sm font-medium tracking-[0.3em] text-gray-600 uppercase">
            Featured Collection
          </span>
          <h2 className="text-4xl lg:text-5xl font-display font-black mt-4 mb-4">
            BESTSELLERS
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover our most trusted grip solutions, engineered for maximum performance and control
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {products.map((product) => (
            <Link 
              key={product.id}
              href={`/product/${product.id}`}
              className="group"
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 mb-4">
                {/* Placeholder Image */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 group-hover:scale-105 transition-transform duration-500">
                  <div className="text-4xl font-display font-black text-white/20">
                    {product.id}
                  </div>
                </div>
                
                {/* Quick Add Button */}
                <button className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-2 bg-white text-black text-sm font-medium rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black hover:text-white">
                  Quick Add
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-gray-500 uppercase tracking-wider">
                  {product.category}
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-gray-600 transition-colors">
                  {product.name}
                </h3>
                <div className="text-lg font-bold">
                  ${product.price}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12 lg:mt-16">
          <Link 
            href="/shop"
            className="inline-block px-8 py-4 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-all duration-300 hover:scale-105"
          >
            VIEW ALL PRODUCTS
          </Link>
        </div>
      </div>
    </section>
  );
}