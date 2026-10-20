import CollectionCard from '../products/CollectionCard';
import SectionHead from '../common/SectionHead';
import { SkBusy, CollectionCardSkeletons } from '../common/Skeleton';

/* Collection index — editorial gallery. Prop-driven: pass `categories` from
   the API. category shape: { id, name, slug, image }. Big overlay-title
   cards (shared CollectionCard) laid out on an asymmetric gallery rhythm.
   Skeleton while empty. */

export default function CategoryCards({ categories = [] }) {
  const skeleton = !categories.length;
  const list = skeleton ? Array.from({ length: 4 }) : categories.slice(0, 4);

  // One uniform aspect ratio so every collection card is the same size.
  const RATIO = 'aspect-[4/5]';

  return (
    <section className="section-y">
      <div className="wrap">
        <SectionHead index={1} eyebrow="Shop by chapter" title="Collections" linkHref="/collections" linkLabel="All collections" />

        {/* Single row — 2 on mobile, 4 from md; extras hidden, not wrapped. */}
        {skeleton ? (
          <SkBusy label="Loading collections…" className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 items-start">
            <CollectionCardSkeletons n={4} ratio={RATIO} vis={(i) => (i >= 2 ? 'hidden md:block' : '')} />
          </SkBusy>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 items-start">
          {list.map((c, i) => (
              <CollectionCard
                key={c.id ?? i}
                collection={c}
                index={i}
                ratio={RATIO}
                className={i >= 2 ? 'hidden md:block' : ''}
              />
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
