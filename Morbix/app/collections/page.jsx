import Link from 'next/link';
import Icon from '@/components/Icon';
import { getCategories, getAllProducts } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Collections' };

const ICONS = ['Activity', 'Dumbbell', 'Gauge', 'Sparkles', 'Layers', 'Leaf'];

export default async function CollectionsPage() {
  const [categories, all] = await Promise.all([getCategories(), getAllProducts()]);

  // If a category has no image of its own, use the first product's photo in
  // that collection as the cover, plus a live product count.
  const enriched = categories.map((c) => {
    const inCat = all.filter((p) => p.categorySlug === c.slug || p.category === c.label);
    return {
      ...c,
      image: c.image || inCat.find((p) => p.image)?.image || '',
      count: c.count || inCat.length,
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
        <div className="cat-grid" style={{ marginTop: 26 }}>
          {enriched.map((c, i) => (
            <Link href={`/collections/${c.slug}`} className="collection-card" key={c.slug}>
              {c.image
                ? <img className="collection-card-img" src={c.image} alt={c.label} loading="lazy" />
                : <span className="collection-card-fallback" aria-hidden><Icon name={c.icon || ICONS[i % ICONS.length]} size={76} /></span>}
              <div className="collection-card-overlay">
                <div className="collection-card-text">
                  <h3>{c.label}</h3>
                  {c.count > 0 && <span>{c.count} product{c.count === 1 ? '' : 's'}</span>}
                </div>
                <span className="collection-card-cta" aria-hidden><Icon name="ArrowRight" size={16} /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
