import Icon from '@/components/Icon';
import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

// Shop: real title band + toolbar stay put; chips and product grid shimmer.
export default function ProductsLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <div className="page-hero">
        <span className="eyebrow">Shop</span>
        <h1>All jewellery</h1>
        <p>Fine handmade jewellery in hallmarked gold and certified stones.</p>
      </div>

      <div className="chips catalog-desktop" style={{ margin: '22px 0 18px' }} aria-hidden="true">
        {[120, 96, 110, 104, 92].map((w, i) => <Skeleton key={i} width={w} height={38} radius={999} />)}
      </div>

      <div className="cat-toolbar">
        <Skeleton width={80} height={13} radius={4} />
        <div className="cat-tools">
          <button className="filter-trigger" type="button" disabled><Icon name="Filter" size={16} /> Filters</button>
          <div className="sort-dd">
            <button className="sort-dd-btn" type="button" disabled><Icon name="Sort" size={15} /> <span>Featured</span> <Icon name="ChevronDown" size={14} className="sort-dd-caret" /></button>
          </div>
        </div>
      </div>

      <ProductGridSkeleton count={8} style={{ marginTop: 20 }} />
    </div>
  );
}
