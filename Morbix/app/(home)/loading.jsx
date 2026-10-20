import Link from 'next/link';
import Icon from '@/components/Icon';
import { HeroSkeleton, CollectionGridSkeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

// Home while its server data loads: the hero band, "Shop by collection" tiles
// and the "Pick your colour" rail, each in its real place and shape.
export default function HomeLoading() {
  return (
    <>
      <HeroSkeleton />
      <section className="section container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Collections</span>
            <h2 style={{ marginTop: 8 }}>Shop by collection</h2>
          </div>
          <Link href="/collections" className="link-more">All collections <Icon name="ArrowRight" size={14} /></Link>
        </div>
        <CollectionGridSkeleton count={3} />
      </section>
      <section className="section container" id="bestsellers">
        <div className="section-head">
          <div>
            <span className="section-eyebrow">Available colours</span>
            <h2 style={{ marginTop: 8 }}>Pick your colour</h2>
          </div>
          <Link href="/products" className="link-more">View all <Icon name="ArrowRight" size={14} /></Link>
        </div>
        <ProductGridSkeleton count={5} />
      </section>
    </>
  );
}
