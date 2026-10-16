import CatalogClient from '@/components/catalog/CatalogClient';
import { getAllProducts, getCategories } from '@/lib/api';
import { buildMetadata } from '@/lib/api/seo';

export async function generateMetadata() {
  return buildMetadata('products', { title: 'Shop' });
}

export default async function ProductsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const cat = sp.cat || 'all';
  const [products, chips] = await Promise.all([getAllProducts(), getCategories()]);

  return <CatalogClient products={products} chips={chips} initialCat={cat} />;
}
