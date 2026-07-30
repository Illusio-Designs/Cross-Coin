import Link from 'next/link';
import CollectionCard from '@/components/CollectionCard';

// Soxbae collections strip on the home page — uses the shared CollectionCard.
export default function CategoryBanners({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="section container sx-collections">
      <div className="section-head">
        <div>
          <span className="eyebrow">The range</span>
          <h2>Find your fit</h2>
        </div>
        <Link href="/collections" className="link-more">All collections</Link>
      </div>

      <div className="sx-collections-grid">
        {items.map((c) => (
          <CollectionCard key={c.slug} href={`/collections/${c.slug}`} image={c.image} label={c.label} icon={c.icon} />
        ))}
      </div>
    </section>
  );
}
