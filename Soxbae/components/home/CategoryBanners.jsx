import Link from 'next/link';
import Icon from '@/components/Icon';

// Soxbae collections — warm editorial: large calm image blocks with the label
// set BELOW the image (not overlaid), generous spacing.
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
        {items.map((c, i) => (
          <Link href={`/collections/${c.slug}`} className="sx-col-card" key={c.slug}>
            <div className="sx-col-media">
              <span className="sx-col-index" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
              {c.image
                ? <img src={c.image} alt={c.label} loading="lazy" />
                : <span className="sx-col-ph" aria-hidden><Icon name="Sparkles" size={44} /></span>}
            </div>
            <div className="sx-col-cap">
              <h3>{c.label}</h3>
              <span className="sx-col-arrow" aria-hidden><Icon name="ArrowRight" size={16} /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
