'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';
import { ik, ikSrcSet } from '@/lib/imagekit';
import SkImg from './SkImg';
import ReviewChip from './ReviewChip';
import BrandIcon from '@/components/ui/BrandIcon';
import NotePhoto from '@/components/product/NotePhoto';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const Heart = ({ filled }) => <BrandIcon name="heart" size={18} fill={filled ? 'currentColor' : 'none'} />;
const Bag = () => <BrandIcon name="bag" size={17} />;

// `priority` — the card is the page's LCP image (home hero bestseller).
export default function ProductCard({ product, priority = false, action, onImageClick, selected = false }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  if (!product) return null;

  const img = product.images?.[0] || '';
  const href = `/product/${product.slug}`;
  // Use the same default variation as the product details page.
  const defVar = (product.variations || []).find((v) => String(v.id) === String(product.defaultVariationId)) || product.variations?.[0] || null;
  const notes = (defVar?.noteItems?.length ? defVar.noteItems : product.notes || [])
    .map((note) => typeof note === 'string' ? { name: note } : note)
    .filter((note) => note?.name);

  const wished = isWishlisted(product.id);
  const orig = product.originalPrice && product.originalPrice > product.price ? product.originalPrice : 0;

  const soldOut = product.inStock === false || defVar?.inStock === false;
  const tile = (
    <span className="m-card__tile">
      {img && <SkImg src={ik(img, 600)} srcSet={ikSrcSet(img, [300, 450, 600, 900])}
        sizes="(max-width: 980px) 50vw, 290px" alt={onImageClick ? '' : product.name}
        loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} />}
    </span>
  );
  const add = (e) => {
    e.preventDefault();
    if (soldOut) return;
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
    <article className={`m-card${selected ? ' m-card--selected' : ''}`}>
      <div className="m-card__fig">
        {onImageClick ? (
          <button type="button" className="m-card__imglink" disabled={soldOut}
            aria-label={`Choose ${product.name} for your pack`} onClick={onImageClick}>{tile}</button>
        ) : (
          <Link className="m-card__imglink" href={href} aria-label={product.name}>{tile}</Link>
        )}
        {product.badge ? <span className="m-card__tag">{product.badge}</span> : null}
        <button className={`m-card__wish ${wished ? 'on' : ''}`} aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} aria-pressed={wished} onClick={wish}><Heart filled={wished} /></button>
        <ReviewChip rating={product.rating} reviews={product.reviews} />

      </div>
      <div className="m-card__body">
        <div className="m-card__top">
          <Link className="m-card__name" href={href}>{product.name}</Link>
          <span className="m-card__price"><b>{inr(product.price)}</b>{orig ? <s>{inr(orig)}</s> : null}</span>
        </div>
        {notes.length > 0 && (
          <ul className="m-card__notes" aria-label="Fragrance notes" role="list">
            {notes.map(({ name, image }) => (
              <li key={name} className="m-card__note">
                {image && <NotePhoto image={image} width={64} />}
                <span>{name}</span>
              </li>
            ))}
          </ul>
        )}
        {!soldOut && action ? action : (
          <button type="button" className="m-card__addbody" disabled={soldOut}
            aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to bag`} onClick={add}>
            <Bag />{soldOut ? 'Sold out' : 'Add to Bag'}
          </button>
        )}
      </div>
    </article>
  );
}
