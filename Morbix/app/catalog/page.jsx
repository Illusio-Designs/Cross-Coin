import Link from 'next/link';
import ProductCard from '@/components/home/ProductCard';
import { getAllProducts, getCategories } from '@/lib/api';

export const metadata = { title: 'Catalog' };

export default async function CatalogPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const cat = sp.cat || 'all';
  const [all, chips] = await Promise.all([getAllProducts(), getCategories()]);

  const products = cat === 'all'
    ? all
    : all.filter((p) => p.categorySlug === cat || p.category.toLowerCase() === cat);

  const activeLabel = chips.find((c) => c.slug === cat)?.label || 'All socks';

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 20 }}>
      <div className="page-hero">
        <span className="eyebrow">Catalog</span>
        <h1>{activeLabel}</h1>
        <p>{products.length} product{products.length === 1 ? '' : 's'} — premium socks engineered for movement and everyday comfort.</p>
      </div>

      <div className="chips" style={{ margin: '22px 0 28px' }}>
        {chips.map((c) => (
          <Link key={c.slug} href={c.slug === 'all' ? '/catalog' : `/catalog?cat=${c.slug}`}
            className={`chip${c.slug === cat ? ' chip-active' : ''}`}>
            {c.label}
          </Link>
        ))}
      </div>

      {products.length > 0 ? (
        <div className="product-grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="empty">No products in this category yet.</div>
      )}
    </div>
  );
}
