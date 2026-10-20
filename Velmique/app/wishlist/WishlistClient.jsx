'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getProductBySlug } from '@/lib/api/products';
import { ik } from '@/lib/imagekit';
import SkImg from '../_components/SkImg';
import { ProductGridSkeleton } from '../_components/Skeleton';

const inr = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
const Heart = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19.5 12.6 12 20l-7.5-7.4a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l1 1 1-1a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5Z" /></svg>
);

export default function WishlistClient() {
  const { wishlist, wishlistLoading, toggleWishlist, addToCart } = useStore();
  const [busy, setBusy] = useState({});

  // Wishlist rows carry only {id,name,price,image,slug}; fetch the product on
  // demand so the bag line gets a real variation for checkout.
  const addToBag = async (w) => {
    setBusy((b) => ({ ...b, [w.id]: true }));
    try {
      const p = w.slug ? await getProductBySlug(w.slug).catch(() => null) : null;
      const v = p?.variations?.find((x) => String(x.id) === String(p.defaultVariationId)) || p?.variations?.[0] || null;
      addToCart({
        id: `${w.id}:${v?.id || 'v'}`,
        productId: w.id,
        variationId: v?.id || p?.defaultVariationId || null,
        name: w.name,
        price: Number(v?.price ?? w.price) || 0,
        size: v?.size || '',
        image: w.image || p?.images?.[0] || '',
        slug: w.slug,
        quantity: 1,
      });
    } finally {
      setBusy((b) => ({ ...b, [w.id]: false }));
    }
  };

  return (
    <section className="m-section"><div className="m-wrap">
      <div className="m-ph" style={{ paddingTop: 0 }}>
        <span className="m-eyebrow">Saved for later</span>
        <h1>Your Wishlist.</h1>
        <p>{wishlist.length ? `${wishlist.length} fragrance${wishlist.length === 1 ? '' : 's'} waiting for you.` : 'Keep the scents you love within reach.'}</p>
      </div>

      {wishlistLoading ? (
        <ProductGridSkeleton count={4} lines="name" button label="Loading your wishlist…" />
      ) : wishlist.length === 0 ? (
        <div className="m-wlempty">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19.5 12.6 12 20l-7.5-7.4a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l1 1 1-1a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5Z" /></svg>
          <p>Your wishlist is empty.</p>
          <Link className="m-btn m-btn--fill" href="/shop">Explore the collection <span className="m-arrow">→</span></Link>
        </div>
      ) : (
        <div className="m-pgrid">
          {wishlist.map((w) => (
            <article className="m-card" key={w.id}>
              <div className="m-card__fig">
                <Link className="m-card__imglink" href={`/product/${w.slug}`} aria-label={w.name}>
                  <span className="m-card__tile">{w.image ? <SkImg src={ik(w.image, 600)} alt={w.name} loading="lazy" /> : null}</span>
                  <span className="m-card__shade" />
                </Link>
                <button className="m-card__wish on" aria-label={`Remove ${w.name} from wishlist`} onClick={() => toggleWishlist(w)}>{Heart}</button>
              </div>
              <div className="m-card__body">
                <div className="m-card__top">
                  <Link className="m-card__name" href={`/product/${w.slug}`}>{w.name}</Link>
                  <span className="m-card__price"><b>{inr(w.price)}</b></span>
                </div>
                <button type="button" className="m-wladd" onClick={() => addToBag(w)} disabled={!!busy[w.id]}>
                  {busy[w.id] ? 'Adding…' : 'Add to bag'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div></section>
  );
}
