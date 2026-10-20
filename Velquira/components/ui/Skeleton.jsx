/**
 * Velquira skeleton kit — warm ivory shimmering placeholders drawn WHERE the
 * content will appear, in the same shape, so nothing jumps when data lands.
 * One shimmer for the whole storefront: `.sk` in app/globals.css.
 *
 *   <Skeleton width="60%" height={14} />         one bar
 *   <SkeletonRegion label="Loading orders…">…    role="status" wrapper
 *   <ProductGridSkeleton count={8} />            lookbook product cards
 *   <CollectionGridSkeleton count={3} />         portrait collection tiles
 *   <BlogGridSkeleton count={3} />               16:9 journal cards
 *   <OrderListSkeleton rows={3} />               order rows
 *
 * Keep the real page title, crumbs, filters and toolbar on screen and replace
 * only the part that is loading. When data is already shown and is being
 * refreshed, keep it (dimmed with `.sk-refreshing`) instead of flashing this.
 */
export function Skeleton({ width = '100%', height = 16, radius = 8, circle = false, className = '', style = {} }) {
  return (
    <span
      className={`sk${circle ? ' sk--circle' : ''}${className ? ' ' + className : ''}`}
      style={{ display: 'block', width: circle ? height : width, height, borderRadius: circle ? '50%' : radius, ...style }}
      aria-hidden="true"
    />
  );
}

/** Accessible wrapper for a loading region: announces once, hides the shapes. */
export function SkeletonRegion({ label = 'Loading…', as: Tag = 'div', className, style, children }) {
  // label={null}: already inside another loading region — just the shapes.
  if (label === null) return <Tag className={className} style={style} aria-hidden="true">{children}</Tag>;
  return (
    <Tag className={className} style={style} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </Tag>
  );
}

const WIDTHS = ['92%', '78%', '86%', '64%', '88%', '72%'];

/** A paragraph of text lines (last line shorter). */
export function SkeletonText({ lines = 3, height = 13, gap = 10, className = '', style }) {
  return (
    <div className={`sk-text${className ? ' ' + className : ''}`} style={{ gap, ...style }} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={height} radius={4} width={i === lines - 1 && lines > 1 ? '55%' : WIDTHS[i % WIDTHS.length]} />
      ))}
    </div>
  );
}

/** The centred page title band (eyebrow + serif title + intro line). Use only
 *  when the real title depends on data; otherwise render the real title. */
export function PageHeroSkeleton({ intro = true, titleWidth = 320 }) {
  return (
    <div className="page-hero sk-hero" aria-hidden="true">
      <Skeleton width={90} height={11} radius={2} />
      <Skeleton width={titleWidth} height={38} radius={4} style={{ maxWidth: '86%' }} />
      {intro && <Skeleton width={420} height={13} radius={4} style={{ maxWidth: '92%' }} />}
    </div>
  );
}

/** Lookbook product card: portrait 3:4 photo with the name/price plate over it. */
export function ProductCardSkeleton() {
  return (
    <div className="vqp sk-vqp" aria-hidden="true">
      <div className="vqp-media">
        <span className="sk sk-fill" />
        <div className="sk-vqp-cap">
          <span className="sk-vqp-line" style={{ width: '62%' }} />
          <span className="sk-vqp-line sm" style={{ width: '30%' }} />
        </div>
      </div>
    </div>
  );
}

/** A grid of product-card skeletons — same `.product-grid` columns as the real one. */
export function ProductGridSkeleton({ count = 8, label = 'Loading products…', className = '', style }) {
  return (
    <SkeletonRegion label={label} className={`product-grid${className ? ' ' + className : ''}`} style={style}>
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </SkeletonRegion>
  );
}

/** Portrait collection tiles (same `.cat-grid` / `.collection-card` box). */
export function CollectionGridSkeleton({ count = 3, label = 'Loading collections…', style }) {
  return (
    <SkeletonRegion label={label} className="cat-grid" style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <div className="collection-card sk-card-box" key={i} aria-hidden="true">
          <span className="sk sk-fill" />
          <div className="sk-vqp-cap" style={{ alignItems: 'flex-start' }}>
            <span className="sk-vqp-line" style={{ width: '55%', height: 18 }} />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

/** Journal cards: 16:9 cover with the meta + title laid over it. */
export function BlogGridSkeleton({ count = 3, label = 'Loading articles…', style }) {
  return (
    <SkeletonRegion label={label} className="blog-grid" style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <div className="blog-card" key={i} aria-hidden="true">
          <div className="blog-media sk-card-box">
            <span className="sk sk-fill" />
            <div className="sk-vqp-cap">
              <span className="sk-vqp-line sm" style={{ width: '34%' }} />
              <span className="sk-vqp-line" style={{ width: '74%', height: 16 }} />
            </div>
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

/** Rows shaped like `.order-row` (order number + date, status pill, total). */
export function OrderListSkeleton({ rows = 3, label = 'Loading orders…', style }) {
  return (
    <SkeletonRegion label={label} className="order-list" style={style}>
      {Array.from({ length: rows }).map((_, i) => (
        <div className="order-row" key={i} aria-hidden="true">
          <div>
            <Skeleton width={i % 2 ? 110 : 130} height={14} radius={4} />
            <Skeleton width={84} height={11} radius={4} style={{ marginTop: 4 }} />
          </div>
          <Skeleton width={78} height={22} radius={999} />
          <Skeleton width={54} height={14} radius={4} />
        </div>
      ))}
    </SkeletonRegion>
  );
}

/** Order-detail page body: items card + summary card. */
export function OrderDetailSkeleton({ items = 2 }) {
  return (
    <div className="order-detail-grid" aria-hidden="true">
      <div className="order-items-card">
        <Skeleton width={60} height={16} radius={4} style={{ marginBottom: 14 }} />
        {Array.from({ length: items }).map((_, i) => (
          <div className="order-item" key={i}>
            <div className="order-item-thumb"><span className="sk sk-fill" /></div>
            <div className="order-item-info">
              <Skeleton width="62%" height={14} radius={4} />
              <Skeleton width="34%" height={11} radius={4} />
              <Skeleton width="22%" height={11} radius={4} />
            </div>
            <Skeleton width={56} height={14} radius={4} />
          </div>
        ))}
      </div>
      <aside className="order-summary-card">
        <Skeleton width={90} height={16} radius={4} style={{ marginBottom: 14 }} />
        {[0, 1, 2, 3].map((i) => (
          <div className="row" key={i}><Skeleton width="34%" height={12} radius={4} /><Skeleton width="22%" height={12} radius={4} /></div>
        ))}
        <Skeleton height={44} radius={999} style={{ marginTop: 14 }} />
      </aside>
    </div>
  );
}

/** The signed-in account dashboard: hero band, stat tiles, tab rail + content. */
export function AccountDashboardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="acc-hero">
        <span className="sk sk--dark" style={{ width: 64, height: 64, borderRadius: 6, flexShrink: 0 }} />
        <div className="acc-hero-info" style={{ display: 'grid', gap: 9 }}>
          <span className="sk sk--dark" style={{ width: 110, height: 11, borderRadius: 3 }} />
          <span className="sk sk--dark" style={{ width: 220, maxWidth: '80%', height: 26, borderRadius: 4 }} />
          <span className="sk sk--dark" style={{ width: 170, maxWidth: '70%', height: 12, borderRadius: 3 }} />
        </div>
      </div>
      <div className="acc-stats">
        {[0, 1, 2, 3].map((i) => (
          <div className="acc-stat" key={i}><Skeleton width={34} height={26} radius={4} /><Skeleton width={70} height={10} radius={3} /></div>
        ))}
      </div>
      <div className="account-layout">
        <div className="account-nav">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={40} radius={4} />)}
        </div>
        <div className="account-content">
          <Skeleton width={140} height={20} radius={4} style={{ marginBottom: 16 }} />
          <div style={{ display: 'grid', gap: 12 }}>
            {[0, 1].map((i) => <Skeleton key={i} height={104} radius={6} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A bordered form card with labelled fields (settings / returns form). */
export function FormSkeleton({ fields = 3, style }) {
  return (
    <div className="contact-form" style={style} aria-hidden="true">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gap: 8 }}>
          <Skeleton width={`${22 + (i % 3) * 8}%`} height={11} radius={3} />
          <Skeleton height={46} radius={12} />
        </div>
      ))}
      <Skeleton width={160} height={46} radius={999} />
    </div>
  );
}

export default Skeleton;
