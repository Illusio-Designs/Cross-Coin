'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';
import { ik } from '@/lib/imagekit';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const Heart = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19.5 12.6 12 20l-7.5-7.4a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l1 1 1-1a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5Z" /></svg>
);
const Star = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.3 6.8.8-5 4.6 1.3 6.7L12 18l-6 3.4 1.3-6.7-5-4.6 6.8-.8L12 2Z" /></svg>
);
const Bag = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
);

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  if (!product) return null;

  const img = product.images?.[0] || '';
  const href = `/product/${product.slug}`;
  // Fragrance notes (from the default variation) as the subtitle.
  const defVar = (product.variations || []).find((v) => String(v.id) === String(product.defaultVariationId)) || product.variations?.[0] || null;
  const noteNames = (defVar?.noteItems?.length
    ? defVar.noteItems.map((n) => n.name)
    : (product.notes || []).map((n) => (typeof n === 'string' ? n : n?.name))
  ).filter(Boolean);
  const noteLine = noteNames.slice(0, 3).join(' · ');

  const wished = isWishlisted(product.id);
  const rating = Number(product.rating || 0);
  const reviews = Number(product.reviews || 0);
  const orig = product.originalPrice && product.originalPrice > product.price ? product.originalPrice : 0;

  const add = (e) => {
    e.preventDefault();
    addToCart({
      id: `${product.id}:${product.defaultVariationId}`,
      productId: product.id,
      variationId: product.defaultVariationId,
      name: product.name,
      price: product.price,
      size: product.sizes?.[0] || '',
      image: img,
      slug: product.slug,
      quantity: 1,
    });
  };
  const wish = (e) => {
    e.preventDefault();
    toggleWishlist({ id: product.id, name: product.name, price: product.price, image: img, slug: product.slug });
  };

  return (
    <article className="m-card">
      <div className="m-card__fig">
        <Link className="m-card__imglink" href={href} aria-label={product.name}>
          <span className="m-card__tile">{img ? <img src={ik(img, 600)} alt={product.name} loading="lazy" decoding="async" /> : null}</span>
          <span className="m-card__shade" />
        </Link>
        {product.badge ? <span className="m-card__tag">{product.badge}</span> : null}
        <button className={`m-card__wish ${wished ? 'on' : ''}`} aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} aria-pressed={wished} onClick={wish}><Heart filled={wished} /></button>
        {rating > 0 ? <span className="m-card__rbadge"><Star />{rating.toFixed(1)}/5</span> : null}
        <button className="m-card__add" aria-label={`Add ${product.name} to bag`} onClick={add}><Bag />Add to bag</button>
      </div>
      <div className="m-card__body">
        <div className="m-card__top">
          <Link className="m-card__name" href={href}>{product.name}</Link>
          <span className="m-card__price"><b>{inr(product.price)}</b>{orig ? <s>{inr(orig)}</s> : null}</span>
        </div>
        {noteLine ? <div className="m-card__notes">{noteLine}</div> : null}
        {reviews > 0 ? <div className="m-card__rc">{reviews.toLocaleString('en-IN')} review{reviews === 1 ? '' : 's'}</div> : null}
        <button className="m-card__addbody" aria-label={`Add ${product.name} to bag`} onClick={add}><Bag />Add to bag</button>
      </div>
    </article>
  );
}
