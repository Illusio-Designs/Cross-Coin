/**
 * Skeleton — a shimmering placeholder block. Compose these to build the
 * per-route loading.jsx screens. Pass width/height (any CSS length), an
 * optional `radius`, and `className` for layout.
 */
export function Skeleton({ width = '100%', height = 16, radius = 8, className = '', style = {} }) {
  return (
    <span
      className={`shimmer${className ? ' ' + className : ''}`}
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/** A product-card shaped skeleton for grid loading states. */
export function ProductCardSkeleton() {
  return (
    <div className="vqp" aria-hidden="true">
      <div className="vqp-media" style={{ aspectRatio: '3 / 4' }}>
        <Skeleton width="100%" height="100%" radius={2} />
      </div>
    </div>
  );
}

/** A grid of product-card skeletons. */
export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export default Skeleton;
