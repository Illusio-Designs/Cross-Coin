import Link from 'next/link';
import Icon from '@/components/Icon';
import { HeroSkeleton, CollectionGridSkeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

// Home while its server data loads: the cover hero, the "Find your fit"
// collection squares and the "most-loved" rail, each in its real place/shape.
export default function HomeLoading() {
  return (
    <>
      <HeroSkeleton />
      <section className="section container sx-collections">
        <div className="section-head">
          <div>
            <span className="eyebrow">The range</span>
            <h2>Find your fit</h2>
          </div>
          <Link href="/collections" className="link-more">All collections</Link>
        </div>
        <CollectionGridSkeleton count={4} />
      </section>
      <section className="section container" id="bestsellers">
        <div className="section-head">
          <div>
            <span className="eyebrow">Crowd favourites</span>
            <h2>The most-loved</h2>
          </div>
          <Link href="/products" className="link-more">View all <Icon name="ArrowRight" size={14} /></Link>
        </div>
        <ProductGridSkeleton count={4} />
      </section>
    </>
  );
}
