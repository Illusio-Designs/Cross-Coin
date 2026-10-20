import Link from 'next/link';
import { Skeleton, SkeletonRegion, SkeletonText } from '@/components/ui/Skeleton';

// Product page: crumbs stay; centred title band, then the gallery (thumb rail +
// 4:5 main image) beside the bordered buy card, then the reviews section.
export default function ProductLoading() {
  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 20 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/products">Shop</Link> <span>/</span>
        <Skeleton width={150} height={12} radius={3} style={{ display: 'inline-block' }} />
      </nav>

      <SkeletonRegion label="Loading product…">
        <div className="pdp-head sk-hero" aria-hidden="true" style={{ gap: 12 }}>
          <Skeleton width={90} height={11} radius={2} />
          <Skeleton width={460} height={44} radius={4} style={{ maxWidth: '90%' }} />
          <Skeleton width={220} height={13} radius={4} />
        </div>

        <div className="pdp" aria-hidden="true">
          <div className="pdp-gallery">
            <div className="pdp-thumbs" style={{ overflow: 'hidden' }}>
              {[0, 1, 2, 3].map((i) => <div className="pdp-thumb" key={i} style={{ position: 'relative' }}><span className="sk sk-fill" /></div>)}
            </div>
            <div className="pdp-main sk-reserve" style={{ aspectRatio: '4 / 5' }}><span className="sk sk-fill" /></div>
          </div>

          <div className="pdp-info">
            <div className="pdp-buycard" style={{ display: 'grid', gap: 14 }}>
              <Skeleton width={170} height={32} radius={4} />
              <Skeleton width={150} height={11} radius={3} />
              <Skeleton width="70%" height={14} radius={4} />
              <Skeleton height={48} radius={12} />
              <div style={{ display: 'grid', gap: 10, paddingTop: 18, borderTop: '1px solid rgba(191,139,46,.3)' }}>
                <Skeleton width={110} height={11} radius={3} />
                <div style={{ display: 'flex', gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} circle height={30} />)}</div>
                <Skeleton width={60} height={11} radius={3} style={{ marginTop: 6 }} />
                <div style={{ display: 'flex', gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} width={52} height={40} radius={3} />)}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <Skeleton width={110} height={50} radius={999} />
                  <Skeleton height={50} radius={999} style={{ flex: 1 }} />
                </div>
              </div>
              <div style={{ paddingTop: 20, marginTop: 6, borderTop: '1px solid rgba(191,139,46,.3)' }}>
                <Skeleton width={190} height={22} radius={4} style={{ marginBottom: 14 }} />
                <SkeletonText lines={4} />
              </div>
            </div>
          </div>
        </div>

        <section className="pdp-reviews section" aria-hidden="true">
          <div className="pdp-rev-head">
            <div className="pdp-rev-headL" style={{ display: 'grid', gap: 10 }}>
              <Skeleton width={70} height={10} radius={2} />
              <Skeleton width={200} height={28} radius={4} />
              <Skeleton width={160} height={14} radius={4} />
            </div>
            <Skeleton width={150} height={46} radius={999} />
          </div>
          <div className="review-grid">
            {[0, 1, 2].map((i) => (
              <div className="review" key={i} style={{ display: 'grid', gap: 10 }}>
                <Skeleton width={90} height={12} radius={3} />
                <SkeletonText lines={3} height={12} gap={8} />
                <Skeleton width={110} height={11} radius={3} />
              </div>
            ))}
          </div>
        </section>
      </SkeletonRegion>
    </div>
  );
}
