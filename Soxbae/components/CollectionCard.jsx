import Link from 'next/link';
import Icon from '@/components/Icon';

// Shared Soxbae collection card — a square image with a floating caption card
// (serif label + round arrow) that overlaps its lower edge. Used on the home
// collections strip and the full Collections page alike.
export default function CollectionCard({ href, image, label, icon = 'Sparkles' }) {
  return (
    <Link href={href} className="sx-col-card">
      <div className="sx-col-media">
        {image
          ? <img src={image} alt={label} loading="lazy" />
          : <span className="sx-col-ph" aria-hidden><Icon name={icon} size={40} /></span>}
      </div>
      <div className="sx-col-cap">
        <h3>{label}</h3>
        <span className="sx-col-arrow" aria-hidden><Icon name="ArrowRight" size={16} /></span>
      </div>
    </Link>
  );
}
