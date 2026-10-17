'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

function stars(r) {
  const n = Math.round(Number(r) || 0);
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  if (!product) return null;

  const img = product.images?.[0] || '';
  // Card subtitle: show ONLY the fragrance notes (from the default variation's
  // `notes` attribute), e.g. "Venilla · Musk". Falls back to product-level
  // notes for older payloads; shows nothing when a product has no notes.
  const defVar = (product.variations || []).find((v) => String(v.id) === String(product.defaultVariationId)) || product.variations?.[0] || null;
  const noteNames = (defVar?.noteItems?.length
    ? defVar.noteItems.map((n) => n.name)
    : (product.notes || []).map((n) => (typeof n === 'string' ? n : n?.name))
  ).filter(Boolean);
  const noteLine = noteNames.slice(0, 4).join(' · ');
  const wished = isWishlisted(product.id);
  const savePct = (product.originalPrice && product.price && product.price < product.originalPrice)
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const add = (e) => {
    e.preventDefault();
    addToCart({
      id: `${product.id}:${product.defaultVariationId}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      size: product.sizes?.[0] || '',
      image: img,
      quantity: 1,
    });
  };

  const wish = (e) => {
    e.preventDefault();
    toggleWishlist({ id: product.id, name: product.name, price: product.price, image: img, slug: product.slug });
  };

  return (
    <article className="m-card">
      <Link className="m-card__fig" href={`/test/product/${product.slug}`} aria-label={product.name}>
        {product.badge ? <span className="m-card__tag">{product.badge}</span> : null}
        <button className={`m-card__wish ${wished ? 'on' : ''}`} aria-label="Toggle wishlist" onClick={wish}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6"><path d="M12 21s-7-4-7-10a7 7 0 0 1 14 0c0 6-7 10-7 10Z"/></svg>
        </button>
        {img ? <img src={img} alt={product.name} loading="lazy" /> : null}
        {savePct ? <span className="m-card__save">Save {savePct}%</span> : null}
      </Link>
      <div className="m-card__body">
        <Link className="m-card__name" href={`/test/product/${product.slug}`}>{product.name}</Link>
        {noteLine ? <div className="m-card__notes">{noteLine}</div> : null}
        <div className="m-card__rate"><span className="m-stars">{stars(product.rating)}</span> {Number(product.rating || 0).toFixed(1)} ({(product.reviews || 0).toLocaleString('en-IN')})</div>
        <div className="m-card__price"><b>{inr(product.price)}</b>{product.originalPrice ? <s>{inr(product.originalPrice)}</s> : null}</div>
        <button className="m-btn m-btn--fill" onClick={add}>Add to cart</button>
      </div>
    </article>
  );
}
