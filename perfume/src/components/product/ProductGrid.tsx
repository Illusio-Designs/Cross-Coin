import ProductCard from './ProductCard'

interface Product {
  id: string
  name: string
  price: number
  image: string
  hoverImage?: string
  rating?: number
  reviews?: number
  badge?: string
}

interface ProductGridProps {
  products: Product[]
}

export default function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  )
}
