import Link from 'next/link';
import Icon from '@/components/Icon';

// Same image-forward collection card as the /collections page (minus the
// product count), so the home "Shop by collection" section matches exactly.
const ICONS = ['Activity', 'Dumbbell', 'Gauge', 'Sparkles'];

export default function CategoryBanners({ items = [] }) {
  return (
    <section className="section container">
      <div className="section-head">
        <div>
          <span className="eyebrow">Collections</span>
          <h2 style={{ marginTop: 8 }}>Shop by collection</h2>
        </div>
        <Link href="/collections" className="link-more">All collections <Icon name="ArrowRight" size={14} /></Link>
      </div>

      <div className="cat-grid">
        {items.map((c, i) => (
          <Link href={`/collections/${c.slug}`} className="collection-card" key={c.slug}>
            {c.image
              ? <img className="collection-card-img" src={c.image} alt={c.label} loading="lazy" />
              : <span className="collection-card-fallback" aria-hidden><Icon name={ICONS[i % ICONS.length]} size={76} /></span>}
            <div className="collection-card-overlay">
              <div className="collection-card-text"><h3>{c.label}</h3></div>
              <span className="collection-card-cta" aria-hidden><Icon name="ArrowRight" size={16} /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
