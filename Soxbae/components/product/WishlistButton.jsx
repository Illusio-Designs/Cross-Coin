'use client';

import { useEffect, useState } from 'react';
import { addToWishlist, removeFromWishlist } from '@/lib/api/wishlist';
import { toast } from '@/lib/toast';

// Heart that FILLS red when active (not just an outline).
function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"
      fill={filled ? 'var(--sale)' : 'none'} stroke={filled ? 'var(--sale)' : 'currentColor'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

const LS_KEY = 'soxbae_wishlist_ids';     // list of keys (uid per colour variant)
const LS_ITEMS = 'soxbae_wishlist_items'; // snapshots so the saved card renders exactly

function readKeys() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function readItems() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_ITEMS) || '[]'); } catch { return []; }
}
function write(keys, items) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(keys));
    localStorage.setItem(LS_ITEMS, JSON.stringify(items));
  } catch {}
}

// Snapshot only the fields ProductCard needs, so the wishlist shows the exact
// colour/image that was saved even without a backend round-trip.
function snapshot(key, product, productId) {
  if (!product) return { key, id: productId };
  const { id, uid, slug, name, category, price, oldPrice, image, badge, badgeKey,
    colors, colorNames, colorParam, sizes, group } = product;
  return { key, id, uid, slug, name, category, price, oldPrice: oldPrice ?? null, image,
    badge, badgeKey, colors, colorNames, colorParam, sizes, group };
}

/** Heart toggle. Keyed by the colour-variant uid so each exploded card is
 *  independent; stores a card snapshot + calls the backend (guest-token) API. */
export default function WishlistButton({ productId, product, className = 'pcard-fav' }) {
  const [active, setActive] = useState(false);
  const key = String(product?.uid ?? productId);

  useEffect(() => {
    setActive(readKeys().includes(key));
  }, [key]);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const keys = readKeys();
    const items = readItems();
    const next = !active;
    setActive(next);
    if (next) {
      write([...new Set([...keys, key])], [...items.filter((i) => String(i.key) !== key), snapshot(key, product, productId)]);
      toast.wishlist('Added to wishlist');
      try { await addToWishlist(productId); } catch {}
    } else {
      write(keys.filter((x) => x !== key), items.filter((i) => String(i.key) !== key));
      toast.wishlist('Removed from wishlist');
      try { await removeFromWishlist(productId); } catch {}
    }
    window.dispatchEvent(new Event('soxbae-wishlist-change'));
  };

  return (
    <button
      className={`${className}${active ? ' active' : ''}`}
      onClick={toggle}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={active}
    >
      <HeartIcon filled={active} />
    </button>
  );
}
