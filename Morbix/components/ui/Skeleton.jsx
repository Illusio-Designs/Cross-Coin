/**
 * Morbix skeleton kit — shimmering placeholders drawn exactly where the content
 * will land, in the store's own shapes (product cards, collection tiles, PDP
 * gallery, order rows…), so nothing jumps when data arrives. The shimmer lives
 * in app/globals.css (`.sk`, cool-grey from --line / --line-soft, static for
 * prefers-reduced-motion).
 *
 *   <Skeleton width="60%" height={14} />          one bar (aria-hidden)
 *   <SkeletonRegion label="Loading orders…">       role="status" wrapper with a
 *     …shapes…                                     visually-hidden label
 *   </SkeletonRegion>
 *   <ProductGridSkeleton count={8} />             same columns as .product-grid
 *
 * Rule of thumb: keep the header, breadcrumbs, filters and page titles on screen
 * and replace only the part that is loading. On a refresh with data already
 * shown, keep the old data (dimmed with `.sk-dim`) instead of flashing these.
 * Server-safe (no hooks) so route loading.jsx files can use it.
 */
import Link from 'next/link';

export function Skeleton({ width = '100%', height = 16, radius = 8, circle = false, dark = false, className = '', style = {} }) {
  const cls = ['sk', dark && 'sk--dark', className].filter(Boolean).join(' ');
  return (
    <span
      aria-hidden="true"
      className={cls}
      style={{ width: circle ? height : width, height, borderRadius: circle ? 999 : radius, flexShrink: circle ? 0 : undefined, ...style }}
    />
  );
}

/** Announces a loading region once to screen readers; children are the shapes. */
export function SkeletonRegion({ label = 'Loading…', as: Tag = 'div', className, style, children }) {
  return (
    <Tag className={className} style={style} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </Tag>
  );
}

/** A full-bleed shimmer that fills a positioned media box (image placeholders). */
function Fill() {
  return <span className="sk sk-fill" aria-hidden="true" />;
}

/* ── Product cards ─────────────────────────────────────────────────────── */

/** Mirrors components/home/ProductCard: 1:1 media, two-line name, price, colour dots. */
export function ProductCardSkeleton() {
  return (
    <div className="pcard pcard--sk" aria-hidden="true">
      <div className="pcard-media"><Fill /></div>
      <div className="pcard-body">
        <div className="pcard-name-sk">
          <Skeleton width="88%" height={13} />
          <Skeleton width="56%" height={13} />
        </div>
        <div className="pcard-price-sk"><Skeleton width="38%" height={18} radius={6} /></div>
        <div className="sk-row" style={{ gap: 5 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} circle height={14} />)}
        </div>
      </div>
    </div>
  );
}

/** A grid of product-card skeletons with the real .product-grid columns. */
export function ProductGridSkeleton({ count = 8, label = 'Loading products…', className = '', style }) {
  return (
    <SkeletonRegion label={label} style={style}>
      <div className={`product-grid${className ? ' ' + className : ''}`}>
        {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    </SkeletonRegion>
  );
}

/* ── Collections / journal ─────────────────────────────────────────────── */

/** Mirrors the 4:5 .collection-card tile (label + arrow over the image). */
export function CollectionCardSkeleton() {
  return (
    <div className="collection-card collection-card--sk" aria-hidden="true">
      <Fill />
      <div className="collection-card-overlay">
        <span className="sk sk--dark" style={{ width: '55%', height: 22, borderRadius: 8 }} />
        <span className="sk sk--dark" style={{ width: 40, height: 40, borderRadius: 999, flexShrink: 0 }} />
      </div>
    </div>
  );
}

export function CollectionGridSkeleton({ count = 3, label = 'Loading collections…', style }) {
  return (
    <SkeletonRegion label={label} style={style}>
      <div className="cat-grid">
        {Array.from({ length: count }).map((_, i) => <CollectionCardSkeleton key={i} />)}
      </div>
    </SkeletonRegion>
  );
}

/** Mirrors the journal .blog-card: 16:9 media, meta, title, excerpt, link. */
export function BlogCardSkeleton() {
  return (
    <div className="blog-card blog-card--sk" aria-hidden="true">
      <div className="blog-media"><Fill /></div>
      <div className="blog-body">
        <Skeleton width="34%" height={10} />
        <Skeleton width="92%" height={16} />
        <Skeleton width="66%" height={16} />
        <Skeleton width="100%" height={12} style={{ marginTop: 4 }} />
        <Skeleton width="78%" height={12} />
        <Skeleton width={110} height={12} style={{ marginTop: 6 }} />
      </div>
    </div>
  );
}

export function BlogGridSkeleton({ count = 3, label = 'Loading articles…', style }) {
  return (
    <SkeletonRegion label={label} style={style}>
      <div className="blog-grid">
        {Array.from({ length: count }).map((_, i) => <BlogCardSkeleton key={i} />)}
      </div>
    </SkeletonRegion>
  );
}

/* ── Home ──────────────────────────────────────────────────────────────── */

/** Mirrors components/home/Hero: navy deal band with copy + two colourway cards. */
export function HeroSkeleton() {
  return (
    <SkeletonRegion as="section" label="Loading offers…" className="heroc container">
      <div className="heroc-band" aria-hidden="true">
        <div className="heroc-copy">
          <Skeleton dark width={130} height={11} />
          <Skeleton dark width="82%" height={46} radius={10} />
          <div className="sk-stack">
            <Skeleton dark width="70%" height={14} />
            <Skeleton dark width="48%" height={14} />
          </div>
          <div className="heroc-cta">
            <Skeleton dark width={132} height={46} radius={999} />
            <Skeleton dark width={84} height={14} />
          </div>
        </div>
        <div className="heroc-cards">
          {[0, 1].map((i) => (
            <div className="heroc-pc heroc-pc--sk" key={i}>
              <span className="heroc-ph"><Fill /></span>
              <Skeleton width="70%" height={12} />
              <Skeleton width="42%" height={13} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}

/* ── Product page ──────────────────────────────────────────────────────── */

/** Mirrors ProductShowcase: 1:1 main image + thumbnail strip, then the buy panel. */
export function PdpSkeleton() {
  return (
    <SkeletonRegion label="Loading product…" className="pdp">
      <div className="pdp-gallery" aria-hidden="true">
        <div className="pdp-thumbs">
          {[0, 1, 2, 3].map((i) => <span key={i} className="pdp-thumb pdp-thumb--sk"><Fill /></span>)}
        </div>
        <div className="pdp-main pdp-main--sk"><Fill /></div>
      </div>
      <div className="pdp-info" aria-hidden="true">
        <Skeleton width="78%" height={34} radius={10} style={{ margin: '8px 0 12px' }} />
        <div className="sk-row" style={{ gap: 14, marginBottom: 14 }}>
          <Skeleton width={42} height={13} /><Skeleton width={74} height={13} /><Skeleton width={96} height={13} />
        </div>
        <Skeleton width="36%" height={30} radius={8} style={{ marginBottom: 16 }} />
        <Skeleton width={150} height={11} style={{ margin: '-6px 0 16px' }} />
        <div className="sk-row" style={{ marginBottom: 18 }}>
          <Skeleton width={88} height={24} radius={999} /><Skeleton width={190} height={14} />
        </div>
        <div className="buy">
          <div className="pdp-opts-row">
            <div className="opt">
              <Skeleton width={110} height={11} style={{ marginBottom: 10 }} />
              <div className="swatches">{[0, 1, 2, 3].map((i) => <Skeleton key={i} circle height={30} />)}</div>
            </div>
            <div className="opt">
              <Skeleton width={40} height={11} style={{ marginBottom: 10 }} />
              <div className="size-row">{[0, 1, 2].map((i) => <Skeleton key={i} width={46} height={44} radius={12} />)}</div>
            </div>
          </div>
          <div className="buy-row">
            <Skeleton width={124} height={48} radius={999} style={{ flexShrink: 0 }} />
            <Skeleton height={48} radius={999} style={{ flex: 1 }} />
          </div>
          <Skeleton height={50} radius={999} />
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** Mirrors ReviewsSection: real heading, rating badge and a row of review cards. */
export function ReviewsSkeleton({ withButton = false }) {
  return (
    <section className="section container">
      <div className="section-head">
        <div>
          <span className="eyebrow">Reviews</span>
          <h2 style={{ marginTop: 8 }}>What our customers say</h2>
        </div>
        <div className="sk-row" aria-hidden="true" style={{ gap: 14 }}>
          <Skeleton width={190} height={42} radius={999} />
          {withButton && <Skeleton width={140} height={44} radius={999} />}
        </div>
      </div>
      <SkeletonRegion label="Loading reviews…" className="sk-rv-row">
        {[0, 1, 2, 3].map((i) => (
          <div className="review review--sk" key={i} aria-hidden="true">
            <div className="review-head">
              <Skeleton circle height={40} />
              <div className="sk-stack" style={{ flex: 1 }}>
                <Skeleton width="55%" height={13} />
                <Skeleton width="35%" height={11} />
              </div>
            </div>
            <div className="sk-stack">
              <Skeleton width="95%" height={12} />
              <Skeleton width="88%" height={12} />
              <Skeleton width="60%" height={12} />
            </div>
          </div>
        ))}
      </SkeletonRegion>
    </section>
  );
}

/* ── Account / orders ──────────────────────────────────────────────────── */

/** One .order-row: order number + date, status pill, total, arrow. */
export function OrderRowSkeleton() {
  return (
    <div className="order-row order-row--sk" aria-hidden="true">
      <div>
        <Skeleton width={120} height={14} />
        <Skeleton width={84} height={11} />
      </div>
      <Skeleton width={84} height={24} radius={999} />
      <Skeleton width={48} height={14} />
      <Skeleton width={15} height={15} radius={4} />
    </div>
  );
}

export function OrderListSkeleton({ rows = 3, label = 'Loading orders…', style }) {
  return (
    <SkeletonRegion label={label} style={style}>
      <div className="order-list">
        {Array.from({ length: rows }).map((_, i) => <OrderRowSkeleton key={i} />)}
      </div>
    </SkeletonRegion>
  );
}

/** The account dashboard's .acc-order-card (number/date + status, total + links). */
export function AccOrderCardsSkeleton({ count = 2, label = 'Loading orders…' }) {
  return (
    <SkeletonRegion label={label} className="acc-order-list">
      {Array.from({ length: count }).map((_, i) => (
        <div className="acc-order-card" key={i} aria-hidden="true">
          <div className="acc-order-top">
            <div className="acc-order-meta" style={{ gap: 7 }}>
              <Skeleton width={130} height={15} />
              <Skeleton width={90} height={11} />
            </div>
            <Skeleton width={84} height={24} radius={999} />
          </div>
          <div className="acc-order-bottom">
            <Skeleton width={70} height={17} />
            <Skeleton width={130} height={34} radius={999} />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function AddressGridSkeleton({ count = 2, label = 'Loading addresses…' }) {
  return (
    <SkeletonRegion label={label} className="addr-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="addr-card" key={i} aria-hidden="true">
          <div className="sk-stack">
            <Skeleton width="45%" height={14} />
            <Skeleton width="90%" height={12} />
            <Skeleton width="60%" height={12} />
          </div>
          <div className="sk-row"><Skeleton width={34} height={12} /><Skeleton width={74} height={12} /><Skeleton width={46} height={12} /></div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

/** Whole account dashboard: gradient hero, stat tiles, tab sidebar + content. */
export function AccountDashboardSkeleton() {
  return (
    <SkeletonRegion label="Loading your account…" className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="acc-hero" aria-hidden="true">
        <div className="acc-hero-avatar" />
        <div className="acc-hero-info sk-stack" style={{ gap: 10 }}>
          <Skeleton dark width={120} height={11} />
          <Skeleton dark width="45%" height={30} />
          <Skeleton dark width="35%" height={13} />
        </div>
      </div>
      <div className="acc-stats" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className="acc-stat" key={i} style={{ gap: 8 }}>
            <Skeleton width={36} height={26} />
            <Skeleton width={70} height={11} />
          </div>
        ))}
      </div>
      <div className="account-layout" aria-hidden="true">
        <div className="account-nav">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="sk-row" style={{ padding: '12px 14px', flexWrap: 'nowrap' }}>
              <Skeleton width={17} height={17} radius={5} /><Skeleton width={`${50 + (i % 3) * 12}%`} height={13} />
            </div>
          ))}
        </div>
        <div className="account-content">
          <div className="section-head" style={{ marginBottom: 16 }}>
            <Skeleton width={120} height={20} /><Skeleton width={70} height={13} />
          </div>
          <div className="acc-order-list">
            {[0, 1].map((i) => (
              <div className="acc-order-card" key={i}>
                <div className="acc-order-top">
                  <div className="acc-order-meta" style={{ gap: 7 }}><Skeleton width={130} height={15} /><Skeleton width={90} height={11} /></div>
                  <Skeleton width={84} height={24} radius={999} />
                </div>
                <div className="acc-order-bottom"><Skeleton width={70} height={17} /><Skeleton width={130} height={34} radius={999} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** Order detail: items card + summary card, matching .order-detail-grid. */
export function OrderDetailSkeleton() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/account">Account</Link> <span>/</span> <Link href="/account/orders">Orders</Link> <span>/</span>
        <Skeleton width={90} height={12} />
      </nav>
      <SkeletonRegion label="Loading order…">
        <div className="account-head" aria-hidden="true">
          <div className="page-hero">
            <span className="eyebrow">Order</span>
            <Skeleton width={240} height={38} radius={10} style={{ margin: '10px 0 12px' }} />
            <Skeleton width={110} height={13} />
          </div>
          <Skeleton width={90} height={24} radius={999} />
        </div>
        <div className="order-detail-grid" aria-hidden="true" style={{ marginTop: 18 }}>
          <div className="order-items-card">
            <h3>Items</h3>
            {[0, 1].map((i) => (
              <div className="order-item" key={i}>
                <span className="order-item-thumb"><Fill /></span>
                <div className="order-item-info" style={{ gap: 7 }}>
                  <Skeleton width="60%" height={14} /><Skeleton width="30%" height={11} /><Skeleton width="20%" height={11} />
                </div>
                <Skeleton width={50} height={14} />
              </div>
            ))}
          </div>
          <div className="order-summary-card">
            <h3>Summary</h3>
            {[0, 1, 2].map((i) => (
              <div className="row" key={i}><Skeleton width={70} height={12} /><Skeleton width={50} height={13} /></div>
            ))}
            <div className="row total"><Skeleton width={50} height={15} /><Skeleton width={64} height={16} /></div>
            <Skeleton height={46} radius={999} style={{ marginTop: 10 }} />
          </div>
        </div>
      </SkeletonRegion>
    </div>
  );
}

/** Track-order result card: header, step dots, item rows, totals. */
export function TrackCardSkeleton() {
  return (
    <SkeletonRegion label="Finding your order…" className="track-card">
      <div className="track-head" aria-hidden="true">
        <div className="sk-stack">
          <Skeleton width={90} height={11} /><Skeleton width={150} height={15} /><Skeleton width={180} height={11} />
        </div>
        <Skeleton width={84} height={24} radius={999} />
      </div>
      <div className="track-steps" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className="track-step" key={i}><Skeleton circle height={34} /><Skeleton width={54} height={10} /></div>
        ))}
      </div>
      <div className="track-items" aria-hidden="true">
        <div className="order-item">
          <span className="order-item-thumb"><Fill /></span>
          <div className="order-item-info" style={{ gap: 7 }}><Skeleton width="60%" height={14} /><Skeleton width="25%" height={11} /></div>
        </div>
      </div>
      <div className="track-details" aria-hidden="true">
        {[0, 1].map((i) => <div className="row" key={i}><Skeleton width={60} height={12} /><Skeleton width={70} height={13} /></div>)}
      </div>
    </SkeletonRegion>
  );
}

/** Paragraph lines for article / policy bodies. Pass label={null} when it sits
    inside another SkeletonRegion. */
export function TextSkeleton({ lines = 6, label = 'Loading…', style }) {
  const widths = ['96%', '91%', '98%', '84%', '93%', '62%'];
  const bars = Array.from({ length: lines }).map((_, i) => (
    <Skeleton key={i} height={14} width={i === lines - 1 ? '55%' : widths[i % widths.length]} />
  ));
  if (label == null) return <div className="sk-stack" style={{ gap: 12, ...style }} aria-hidden="true">{bars}</div>;
  return <SkeletonRegion label={label} className="sk-stack" style={{ gap: 12, ...style }}>{bars}</SkeletonRegion>;
}

/** A .contact-form card: heading, labelled inputs and the submit button. */
export function FormSkeleton({ fields = 3, label = 'Loading…', style }) {
  return (
    <SkeletonRegion label={label} className="contact-form" style={style}>
      <Skeleton width={150} height={18} />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="sk-stack" aria-hidden="true">
          <Skeleton width={`${22 + (i % 3) * 8}%`} height={12} />
          <Skeleton height={46} radius={12} />
        </div>
      ))}
      <Skeleton width={170} height={48} radius={999} />
    </SkeletonRegion>
  );
}

export default Skeleton;
