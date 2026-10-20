import Link from 'next/link';
import Icon from '@/components/Icon';
import ShimmerImg from '@/components/ui/ShimmerImg';

// Shared Soxbae collection card — a square image with a floating caption card
// (serif label + round arrow) that overlaps its lower edge. Used on the home
// collections strip and the full Collections page alike.
export default function CollectionCard({ href, image, label, icon = 'Sparkles' }) {
  return (
    <Link href={href} className="sx-col-card">
      <div className="sx-col-media">
        {image
          ? <ShimmerImg src={image} alt={label} width={600} widths={[300, 600]} sizes="(max-width: 520px) 50vw, (max-width: 860px) 33vw, 300px"
              fallback={<span className="sx-col-ph" aria-hidden><Icon name={icon} size={40} /></span>} />
          : <span className="sx-col-ph" aria-hidden><Icon name={icon} size={40} /></span>}
      </div>
      <div className="sx-col-cap">
        <h3>{label}</h3>
        <span className="sx-col-arrow" aria-hidden><Icon name="ArrowRight" size={16} /></span>
      </div>
    </Link>
  );
}
