import { ProductGridSkeleton } from '@/components/ui/Skeleton';

export default function WishlistLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Wishlist</span>
        <h1>Your wishlist</h1>
        <p>Saved pairs, ready when you are.</p>
      </div>
      <ProductGridSkeleton count={5} label="Loading your wishlist…" style={{ marginTop: 24 }} />
    </div>
  );
}
