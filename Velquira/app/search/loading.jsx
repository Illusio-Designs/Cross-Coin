import Icon from '@/components/Icon';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';

export default function SearchLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Search</span>
        <h1>Search products</h1>
      </div>
      <div className="search-input" style={{ margin: '20px auto 8px', maxWidth: 520 }}>
        <Icon name="Search" size={18} color="#6a7186" />
        <input placeholder="Search by style, metal or gemstone…" aria-label="Search products" disabled />
      </div>
      <ProductGridSkeleton count={4} label="Loading results…" style={{ marginTop: 18 }} />
    </div>
  );
}
