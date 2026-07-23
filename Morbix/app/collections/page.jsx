import Link from 'next/link';
import Icon from '@/components/Icon';
import { getCategories } from '@/lib/api';

export const revalidate = 300;
export const metadata = { title: 'Collections' };

const ICONS = ['Activity', 'Dumbbell', 'Gauge', 'Sparkles', 'Layers', 'Leaf'];

export default async function CollectionsPage() {
  const categories = await getCategories();

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Collections</span>
        <h1>Shop by collection</h1>
        <p>Find the right pair for every kind of movement.</p>
      </div>

      {categories.length === 0 ? (
        <div className="empty">No collections yet — check back soon.</div>
      ) : (
        <div className="cat-grid" style={{ marginTop: 26 }}>
          {categories.map((c, i) => (
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
