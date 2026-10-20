import { Suspense } from 'react'
import ProductsClient from './ProductsClient'
import { ProductsSkeleton } from './ProductsSkeleton'
import { buildMetadata } from '@/lib/api/seo'

// Server-rendered, dashboard-driven SEO for the products listing. The
// interactive, filterable grid lives in ProductsClient (a client component);
// it uses useSearchParams, so it must sit inside a Suspense boundary.
export async function generateMetadata() {
  return buildMetadata('products', { title: 'Products' })
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsSkeleton />}>
      <ProductsClient />
    </Suspense>
  )
}
