import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton'

// Account-area skeletons drawn with the real account classes (pf-*, acc-*),
// so each placeholder sits exactly where its content will appear.

/** Order cards: head (number, date, status pill), one item row, footer. */
export function OrderCardsSkeleton({ count = 2, label = 'Loading your orders…' }) {
  return (
    <SkeletonRegion label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <div className="pf-order-card" key={i} aria-hidden="true">
          <div className="pf-order-head">
            <div className="pf-order-meta">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="pf-order-item">
            <div className="pf-order-img relative"><div className="sk absolute inset-0" /></div>
            <div className="pf-order-item-info">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
            <Skeleton className="h-3.5 w-12" />
          </div>
          <div className="pf-order-foot">
            <Skeleton className="h-4 w-36" />
            <div className="pf-order-actions">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </SkeletonRegion>
  )
}

/** Address cards grid. */
export function AddressCardsSkeleton({ count = 2, label = 'Loading your addresses…' }) {
  return (
    <SkeletonRegion label={label} className="pf-addr-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="pf-addr-card" key={i} aria-hidden="true">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="pf-addr-body" style={{ flex: 1 }}>
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="mt-2 h-3 w-5/6" />
            <Skeleton className="mt-2 h-3 w-2/3" />
            <div className="mt-3 flex gap-2"><Skeleton className="h-7 w-14 rounded-md" /><Skeleton className="h-7 w-16 rounded-md" /></div>
          </div>
        </div>
      ))}
    </SkeletonRegion>
  )
}

/** The whole /account page while sign-in state resolves. */
export function AccountPageSkeleton() {
  return (
    <SkeletonRegion label="Loading your account…" className="pf-page">
      <div className="acc-hero-wrap" aria-hidden="true">
        <div className="acc-hero">
          <Skeleton className="sk--dark h-16 w-16 shrink-0 rounded-[14px]" />
          <div className="acc-hero-info flex flex-col gap-2">
            <Skeleton className="sk--dark h-3 w-24" />
            <Skeleton className="sk--dark h-6 w-48 max-w-[80%]" />
            <Skeleton className="sk--dark h-3 w-40 max-w-[70%]" />
          </div>
        </div>
      </div>
      <div className="acc-stats-wrap" aria-hidden="true">
        <div className="acc-stats">
          {['Orders', 'Addresses', 'Delivered', 'Active'].map((l) => (
            <div className="acc-stat" key={l}><Skeleton className="mx-auto h-6 w-8" /><div className="acc-stat-label">{l}</div></div>
          ))}
        </div>
      </div>
      <div className="pf-body" aria-hidden="true">
        <aside className="pf-sidebar">
          <div className="pf-nav flex flex-col gap-1 p-2">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        </aside>
        <div className="pf-main">
          <div className="pf-section">
            <div className="pf-section-title">My Orders</div>
            <OrderCardsSkeleton count={2} label={null} />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  )
}
