import { Skeleton, SkeletonRegion, ProductGridSkeleton, CollectionGridSkeleton } from '@/components/ui/Skeleton';

// Home: the arched editorial hero, then the collection tiles and the
// "Signature Pieces" product rail — same boxes as the real sections.
export default function HomeLoading() {
  return (
    <>
      <SkeletonRegion as="section" className="vq-hero" label="Loading the Velquira home page…">
        <div className="container vq-hero-inner" aria-hidden="true">
          <Skeleton width={170} height={10} radius={2} style={{ marginBottom: 18 }} />
          <Skeleton width={240} height={12} radius={2} />
          <Skeleton width={560} height={64} radius={6} style={{ marginTop: 22, maxWidth: '92%' }} />
          <Skeleton width={360} height={64} radius={6} style={{ marginTop: 10, maxWidth: '70%' }} />
          <Skeleton width={480} height={14} radius={4} style={{ marginTop: 26, maxWidth: '88%' }} />
          <Skeleton width={380} height={14} radius={4} style={{ marginTop: 10, marginBottom: 32, maxWidth: '72%' }} />
          <div className="vq-hero-cta">
            <Skeleton width={210} height={48} radius={999} />
            <Skeleton width={130} height={14} radius={4} />
          </div>
          <div className="vq-hero-frame"><span className="sk sk-fill" /></div>
        </div>
      </SkeletonRegion>

      <section className="section container">
        <div className="section-head" aria-hidden="true">
          <div style={{ display: 'grid', gap: 10 }}>
            <Skeleton width={90} height={10} radius={2} />
            <Skeleton width={260} height={28} radius={4} />
          </div>
        </div>
        <CollectionGridSkeleton count={3} />
      </section>

      <section className="section container">
        <div className="section-head">
          <span className="eyebrow">Customer favourites</span><h2>Signature Pieces</h2>
        </div>
        <ProductGridSkeleton count={4} />
      </section>
    </>
  );
}
