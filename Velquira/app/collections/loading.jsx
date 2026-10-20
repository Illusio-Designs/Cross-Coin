import { CollectionGridSkeleton } from '@/components/ui/Skeleton';

export default function CollectionsLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Collections</span>
        <h1>Shop by collection</h1>
        <p>Rings, necklaces, earrings and more — each piece handmade and hallmarked.</p>
      </div>
      <CollectionGridSkeleton count={6} style={{ marginTop: 26 }} />
    </div>
  );
}
