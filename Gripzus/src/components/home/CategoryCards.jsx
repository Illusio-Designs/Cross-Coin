import Link from 'next/link';
import CollectionCard from '../products/CollectionCard';

/* Collection index — editorial gallery. Prop-driven: pass `categories` from
   the API. category shape: { id, name, slug, image }. Big overlay-title
   cards (shared CollectionCard) laid out on an asymmetric gallery rhythm.
   Skeleton while empty. */

export default function CategoryCards({ categories = [] }) {
  const skeleton = !categories.length;
  const list = skeleton ? Array.from({ length: 4 }) : categories.slice(0, 4);

  // Asymmetric aspect ratios for a gallery-wall rhythm.
  const ratios = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-[4/5]', 'aspect-[3/4]'];

  return (
    <section className="section-y">
      <div className="wrap">
        {/* quiet header */}
        <div className="flex items-end justify-between mb-10 md:mb-14">
          <div>
            <p className="eyebrow text-ink-muted mb-3">Shop by chapter</p>
            <h2 className="h-display text-2xl md:text-3xl">Collections</h2>
          </div>
          <Link href="/collections" className="link-line">All collections</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 items-start">
          {list.map((c, i) => (
            skeleton ? (
              <div key={i} className="md:[&:nth-child(even)]:mt-10">
                <div className={`${ratios[i % ratios.length]} rounded-xl bg-paper-deep animate-pulse`} />
              </div>
            ) : (
              <CollectionCard
                key={c.id ?? i}
                collection={c}
                index={i}
                ratio={ratios[i % ratios.length]}
                className="md:[&:nth-child(even)]:mt-10"
              />
            )
          ))}
        </div>
      </div>
    </section>
  );
}
