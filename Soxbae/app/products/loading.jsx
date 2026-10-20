import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

// Shop grid while products load: title, category chips and the Filters/Sort
// toolbar keep their places; the grid uses the real .product-grid columns.
export default function ProductsLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <div className="page-hero">
        <span className="eyebrow">Shop</span>
        <Skeleton width={240} height={40} radius={10} style={{ margin: '10px 0 12px' }} />
        <p>Premium socks engineered for movement and everyday comfort.</p>
      </div>
      <div className="chips catalog-desktop" style={{ margin: '22px 0 18px' }} aria-hidden="true">
        {[96, 120, 110, 132, 104].map((w, i) => <Skeleton key={i} width={w} height={42} radius={999} />)}
      </div>
      <div className="cat-toolbar" aria-hidden="true">
        <Skeleton width={90} height={14} />
        <div className="cat-tools">
          <Skeleton width={104} height={44} radius={999} />
          <Skeleton width={128} height={38} radius={999} />
        </div>
      </div>
      <ProductGridSkeleton count={8} style={{ marginTop: 20 }} />
    </div>
  );
}
