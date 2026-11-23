import Link from 'next/link';
import BrandIcon from '@/components/ui/BrandIcon';

export default function PackBagCard({ count = 0, savings = 0, onOpen }) {
  return (
    <div className="v-bag-pack">
      <span className="v-bag-pack__icon" aria-hidden="true"><BrandIcon name="sparkles" size={22} /></span>
      <div>
        <strong>{count ? 'Your fragrance pack' : 'Build Your Pack'}</strong>
        <p>{count
          ? `${count} ${count === 1 ? 'bottle' : 'bottles'}${savings > 0 ? ` · ₹${savings.toLocaleString('en-IN')} saved` : ''}`
          : 'Mix your favorite fragrances.'}</p>
      </div>
      <Link href="/pack" className="v-bag-pack__link" onClick={onOpen}>
        {count ? 'Explore packs' : 'Build a pack'} <BrandIcon name="arrow" size={15} />
      </Link>
    </div>
  );
}
