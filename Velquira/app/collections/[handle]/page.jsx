import Link from 'next/link';
import Icon from '@/components/Icon';
import ProductCard from '@/components/home/ProductCard';
import { getProductsByCategory, getCategories } from '@/lib/api';

// Render on-demand with fresh collection products (no stale server cache).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const categories = await getCategories();
  const cat = categories.find((c) => c.slug === handle);
  return { title: cat ? cat.label : 'Collection' };
}

export default async function CollectionPage({ params }) {
  const { handle } = await params;
  const [products, categories] = await Promise.all([getProductsByCategory(handle), getCategories()]);
  const cat = categories.find((c) => c.slug === handle);
  const title = cat ? cat.label : handle;

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/collections">Collections</Link> <span>/</span> <b>{title}</b>
      </nav>
      <div className="page-hero">
        <span className="eyebrow">Collection</span>
        <h1>{title}</h1>
        <p>{products.length} product{products.length === 1 ? '' : 's'} in this collection.</p>
      </div>

      {products.length === 0 ? (
        <div className="empty" style={{ marginTop: 20 }}>
          No products in this collection yet.
          <Link href="/products" className="btn btn-primary">Browse all socks</Link>
        </div>
      ) : (
        <div className="product-grid" style={{ marginTop: 24 }}>
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
