/**
 * Soxbae skeleton kit — warm ivory shimmer drawn exactly where the content will
 * land, in Soxbae's own shapes (plate product cards, captioned collection
 * squares, journal cards, the cover hero, the PDP gallery…), so nothing jumps
 * when data arrives. The shimmer lives at the end of app/globals.css (`.sk`,
 * from --line-soft / --card, static for prefers-reduced-motion).
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

export function Skeleton({ width = '100%', height = 16, radius = 10, circle = false, deep = false, className = '', style = {} }) {
  const cls = ['sk', deep && 'sk--deep', className].filter(Boolean).join(' ');
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

/** Mirrors components/home/ProductCard: framed 1:1 photo + the floating info plate. */
export function ProductCardSkeleton() {
  return (
    <div className="sxp sxp--sk" aria-hidden="true">
      <div className="sxp-media"><Fill /></div>
      <div className="sxp-info">
        <div className="sxp-plate-row">
          <div className="sxp-name-sk">
            <Skeleton width="86%" height={13} radius={6} />
            <Skeleton width="52%" height={13} radius={6} />
          </div>
          <Skeleton width={46} height={13} radius={6} />
        </div>
        <div className="sxp-plate-foot">
          <div className="sk-row" style={{ gap: 6 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} circle height={15} />)}
          </div>
          <Skeleton circle height={36} />
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

/** Mirrors components/CollectionCard: square photo + overlapping caption card. */
export function CollectionCardSkeleton() {
  return (
    <div className="sx-col-card sx-col-card--sk" aria-hidden="true">
      <div className="sx-col-media"><Fill /></div>
      <div className="sx-col-cap">
        <Skeleton width="58%" height={15} radius={6} />
        <Skeleton circle height={34} />
      </div>
    </div>
  );
}

export function CollectionGridSkeleton({ count = 4, label = 'Loading collections…', style }) {
  return (
    <SkeletonRegion label={label} style={style}>
      <div className="sx-collections-grid">
        {Array.from({ length: count }).map((_, i) => <CollectionCardSkeleton key={i} />)}
      </div>
    </SkeletonRegion>
  );
}

/** Mirrors components/BlogCard: 16:9 photo, date, serif title, excerpt, link. */
export function BlogCardSkeleton() {
  return (
    <div className="sx-jr-card sx-jr-card--sk" aria-hidden="true">
      <div className="sx-jr-media"><Fill /></div>
      <div className="sx-jr-body sk-stack" style={{ gap: 10 }}>
        <Skeleton width={90} height={10} radius={5} />
        <Skeleton width="90%" height={20} radius={6} />
        <Skeleton width="62%" height={20} radius={6} />
        <Skeleton width="100%" height={12} radius={5} style={{ marginTop: 2 }} />
        <Skeleton width="74%" height={12} radius={5} />
        <Skeleton width={104} height={12} radius={5} style={{ marginTop: 4 }} />
      </div>
    </div>
  );
}

export function BlogGridSkeleton({ count = 3, label = 'Loading articles…', className = '', style }) {
  return (
    <SkeletonRegion label={label} className={className || undefined} style={style}>
      <div className="sx-jr-grid">
        {Array.from({ length: count }).map((_, i) => <BlogCardSkeleton key={i} />)}
      </div>
    </SkeletonRegion>
  );
}

/* ── Home ──────────────────────────────────────────────────────────────── */

/** Mirrors components/home/Hero: the full-bleed cover stage with copy bottom-left. */
export function HeroSkeleton() {
  return (
    <SkeletonRegion as="section" label="Loading…" className="sx-hero">
      <div className="container">
        <div className="sxh-stage" aria-hidden="true">
          <Fill />
          <div className="sxh-inner sk-stack" style={{ gap: 14 }}>
            <Skeleton deep width={130} height={11} radius={5} />
            <Skeleton deep width="min(520px, 70vw)" height={48} radius={10} />
            <Skeleton deep width="min(380px, 55vw)" height={48} radius={10} />
            <Skeleton deep width="min(420px, 60vw)" height={14} radius={6} style={{ marginTop: 6 }} />
            <div className="sxh-actions" style={{ marginTop: 10 }}>
              <Skeleton deep width={180} height={47} radius={999} />
              <Skeleton deep width={110} height={14} radius={6} />
            </div>
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

/* ── Product page ──────────────────────────────────────────────────────── */

/** Mirrors ProductShowcase (.pdx): 1:1 main image over a thumbnail rail, buy panel. */
export function PdpSkeleton() {
  return (
    <SkeletonRegion label="Loading product…" className="pdx">
      <div className="pdx-gallery" aria-hidden="true">
        <div className="pdx-rail">
          {[0, 1, 2, 3].map((i) => <span key={i} className="pdx-thumb pdx-thumb--sk"><Fill /></span>)}
        </div>
        <div className="pdx-main"><Fill /></div>
      </div>
      <div className="pdx-buy" aria-hidden="true">
        <div className="sk-stack" style={{ gap: 12, marginTop: 12 }}>
          <Skeleton width="82%" height={40} radius={10} />
          <Skeleton width="48%" height={40} radius={10} />
        </div>
        <div className="sk-row" style={{ marginTop: 16 }}>
          <Skeleton width={84} height={15} /><Skeleton width={28} height={13} /><Skeleton width={70} height={13} />
        </div>
        <Skeleton width={150} height={32} radius={8} style={{ marginTop: 18 }} />
        <Skeleton width={150} height={11} style={{ marginTop: 10 }} />
        <Skeleton width={260} height={14} style={{ margin: '18px 0 22px' }} />
        <div className="pdx-opts-row">
          <div className="pdx-opt">
            <Skeleton width={120} height={12} style={{ marginBottom: 12 }} />
            <div className="sk-row">{[0, 1, 2, 3].map((i) => <Skeleton key={i} circle height={34} />)}</div>
          </div>
          <div className="pdx-opt">
            <Skeleton width={40} height={12} style={{ marginBottom: 12 }} />
            <div className="pdx-sizes">{[0, 1, 2].map((i) => <Skeleton key={i} width={52} height={46} radius={11} />)}</div>
          </div>
        </div>
        <div className="pdx-actions">
          <Skeleton width={128} height={54} radius={999} style={{ flexShrink: 0 }} />
          <Skeleton height={54} radius={999} style={{ flex: '1 1 200px' }} />
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** Mirrors components/reviews/Reviews: real heading, score, then review cards. */
export function ReviewsSkeleton({ title = 'Customer reviews', withButton = false }) {
  return (
    <section className="section container sx-reviews">
      <div className="sx-reviews-head">
        <div>
          <span className="eyebrow">Reviews</span>
          <h2>{title}</h2>
        </div>
        <div className="sx-reviews-right" aria-hidden="true">
          <Skeleton width={170} height={30} radius={8} />
          {withButton && <Skeleton width={150} height={42} radius={999} />}
        </div>
      </div>
      <SkeletonRegion label="Loading reviews…" className="sk-rv-row">
        {[0, 1, 2, 3].map((i) => (
          <div className="sx-review sx-review--sk" key={i} aria-hidden="true">
            <Skeleton width={80} height={13} radius={5} style={{ marginBottom: 14 }} />
            <div className="sk-stack" style={{ marginBottom: 18 }}>
              <Skeleton width="96%" height={12} radius={5} />
              <Skeleton width="88%" height={12} radius={5} />
              <Skeleton width="58%" height={12} radius={5} />
            </div>
            <div className="sx-review-by">
              <Skeleton circle height={38} />
              <div className="sk-stack" style={{ flex: 1 }}><Skeleton width="50%" height={12} /><Skeleton width="30%" height={10} /></div>
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

function AccOrderCardSk() {
  return (
    <div className="acc-order-card" aria-hidden="true">
      <div className="acc-order-main" style={{ gap: 8 }}>
        <div className="acc-order-top"><Skeleton width={120} height={15} /><Skeleton width={80} height={22} radius={999} /></div>
        <Skeleton width={90} height={11} />
      </div>
      <div className="acc-order-side">
        <Skeleton width={56} height={16} />
        <Skeleton width={84} height={34} radius={999} />
      </div>
    </div>
  );
}

/** The account dashboard's .acc-order-card rows (number + badge / date, total + View). */
export function AccOrderCardsSkeleton({ count = 2, label = 'Loading orders…' }) {
  return (
    <SkeletonRegion label={label} className="acc-order-list">
      {Array.from({ length: count }).map((_, i) => <AccOrderCardSk key={i} />)}
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

/** Whole account dashboard: hero band, stat tiles, tab sidebar + content. */
export function AccountDashboardSkeleton() {
  return (
    <SkeletonRegion label="Loading your account…" className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="acc-hero acc-hero--sk" aria-hidden="true">
        <div className="acc-avatar" />
        <div className="acc-hero-info sk-stack" style={{ gap: 10 }}>
          <Skeleton deep width={110} height={12} />
          <Skeleton deep width="45%" height={30} />
          <Skeleton deep width="35%" height={13} />
        </div>
        <Skeleton deep width={110} height={40} radius={999} style={{ flexShrink: 0 }} />
      </div>
      <div className="acc-stats" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className="acc-stat" key={i}>
            <Skeleton width={34} height={26} style={{ margin: '0 auto' }} />
            <Skeleton width={70} height={11} style={{ margin: '8px auto 0' }} />
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
          <div className="acc-order-list"><AccOrderCardSk /><AccOrderCardSk /></div>
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
            <Skeleton width={240} height={40} style={{ margin: '10px 0 12px' }} />
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
    <Skeleton key={i} height={14} radius={6} width={i === lines - 1 ? '55%' : widths[i % widths.length]} />
  ));
  if (label == null) return <div className="sk-stack" style={{ gap: 13, ...style }} aria-hidden="true">{bars}</div>;
  return <SkeletonRegion label={label} className="sk-stack" style={{ gap: 13, ...style }}>{bars}</SkeletonRegion>;
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
