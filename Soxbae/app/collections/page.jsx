import CollectionCard from '@/components/CollectionCard';
import { getCategories, getAllProducts } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Collections' };

const ICONS = ['Activity', 'Dumbbell', 'Gauge', 'Sparkles', 'Layers', 'Leaf'];

export default async function CollectionsPage() {
  const [categories, all] = await Promise.all([getCategories(), getAllProducts()]);

  // If a category has no image of its own, use the first product's photo in
  // that collection as the cover.
  const enriched = categories.map((c) => {
    const inCat = all.filter((p) => p.categorySlug === c.slug || p.category === c.label);
    return {
      ...c,
      image: c.image || inCat.find((p) => p.image)?.image || '',
    };
  });

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Collections</span>
        <h1>Shop by collection</h1>
        <p>Find the right pair for every kind of movement.</p>
      </div>

      {enriched.length === 0 ? (
        <div className="empty">No collections yet — check back soon.</div>
      ) : (
        <div className="sx-collections-grid" style={{ marginTop: 26 }}>
          {enriched.map((c, i) => (
            <CollectionCard key={c.slug} href={`/collections/${c.slug}`} image={c.image} label={c.label} icon={c.icon || ICONS[i % ICONS.length]} />
          ))}
        </div>
      )}
    </div>
  );
}
