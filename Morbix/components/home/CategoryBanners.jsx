import Link from 'next/link';
import Icon from '@/components/Icon';

// Branded gradient placeholders per category. Drop real photos at
// public/cat-<slug>.webp and set them as the .cat-img background to go live.
const ICONS = ['Activity', 'Dumbbell', 'Gauge', 'Sparkles'];

export default function CategoryBanners({ banners = [] }) {
  return (
    <section className="section container">
      <div className="cat-grid">
        {banners.map((b, i) => (
          <Link href={`/catalog?cat=${b.slug}`} className={`cat-banner cat-banner-${i % 4}`} key={b.title}>
            <div className="cat-copy">
              <h3>{b.title}</h3>
              <p>{b.text}</p>
              <span className="link-more" style={{ color: 'var(--navy)' }}>Shop <Icon name="ArrowRight" size={14} /></span>
            </div>
            <div className="cat-icon" aria-hidden><Icon name={ICONS[i % ICONS.length]} size={90} /></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
