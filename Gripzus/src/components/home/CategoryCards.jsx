import CollectionCard from '../products/CollectionCard';
import SectionHead from '../common/SectionHead';

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 items-start">
          {list.map((c, i) => (
            skeleton ? (
              <div key={i} className={i >= 2 ? 'hidden md:block' : ''}>
                <div className={`${RATIO} rounded-xl bg-paper-deep animate-pulse`} />
              </div>
            ) : (
              <CollectionCard
                key={c.id ?? i}
                collection={c}
                index={i}
                ratio={RATIO}
                className={i >= 2 ? 'hidden md:block' : ''}
              />
            )
          ))}
        </div>
      </div>
    </section>
  );
}
