import Icon from '@/components/Icon';
import ProductCard from '@/components/home/ProductCard';
import { searchProducts } from '@/lib/api';

export const metadata = { title: 'Search' };

export default async function SearchPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const q = (sp.q || '').trim();
  const results = q ? await searchProducts(q) : [];

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Search</span>
        <h1>{q ? `Results for “${q}”` : 'Search products'}</h1>
      </div>

      <form className="search-input" action="/search" method="get" style={{ margin: '20px 0 8px', maxWidth: 520 }}>
        <Icon name="Search" size={18} color="#6a7186" />
        <input name="q" defaultValue={q} placeholder="Search by style, size or technology…" aria-label="Search products" />
        <button className="go" aria-label="Search" type="submit"><Icon name="Search" size={16} /></button>
      </form>

      {!q ? (
        <div className="empty">Type something to search the Morbix catalog.</div>
      ) : results.length === 0 ? (
        <div className="empty">No products match “{q}”.</div>
      ) : (
        <>
          <p className="muted" style={{ margin: '18px 0' }}>{results.length} result{results.length === 1 ? '' : 's'}</p>
          <div className="product-grid">
            {results.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
