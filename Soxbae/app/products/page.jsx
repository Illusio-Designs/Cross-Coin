import CatalogClient from '@/components/catalog/CatalogClient';
import { getAllProducts, getCategories } from '@/lib/api';

export const metadata = { title: 'Shop' };

export default async function ProductsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const cat = sp.cat || 'all';
  const [products, chips] = await Promise.all([getAllProducts(), getCategories()]);

  return <CatalogClient products={products} chips={chips} initialCat={cat} />;
}
