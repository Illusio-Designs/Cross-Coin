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
            <Link href={`/collections/${c.slug}`} className={`cat-banner cat-banner-${i % 4}`} key={c.slug}>
              <div className="cat-copy">
                <h3>{c.label}</h3>
                <p>Shop the {c.label} collection.</p>
                <span className="link-more" style={{ color: 'var(--navy)' }}>Shop <Icon name="ArrowRight" size={14} /></span>
              </div>
              <div className="cat-icon" aria-hidden><Icon name={c.icon || ICONS[i % ICONS.length]} size={90} /></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
