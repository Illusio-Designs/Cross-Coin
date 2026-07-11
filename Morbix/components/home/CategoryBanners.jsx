import Link from 'next/link';
import Icon from '@/components/Icon';

const IMAGES = [
  'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=900&q=70',
];

export default function CategoryBanners({ banners = [] }) {
  return (
    <section className="section container">
      <div className="cat-grid">
        {banners.map((b, i) => (
          <Link href={`/catalog?cat=${b.slug}`} className="cat-banner" key={b.title}>
            <div className="cat-img"><img src={IMAGES[i % IMAGES.length]} alt={b.title} loading="lazy" /></div>
            <div className="cat-copy">
              <h3>{b.title}</h3>
              <p>{b.text}</p>
              <span className="link-more" style={{ color: 'var(--navy)' }}>Shop <Icon name="ArrowRight" size={14} /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
