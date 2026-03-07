import ProductDetail from '@/components/product/ProductDetail'

export default function ProductPage({ params }: { params: { id: string } }) {
  return <ProductDetail productId={params.id} />
}
