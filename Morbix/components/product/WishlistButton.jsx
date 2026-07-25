'use client';

import { useEffect, useState } from 'react';
import { addToWishlist, removeFromWishlist } from '@/lib/api/wishlist';

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

const LS_KEY = 'morbix_wishlist_ids';

function readLocal() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function writeLocal(ids) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch {}
}

/** Heart toggle. Optimistically updates a localStorage id set + calls the
 *  backend wishlist API (which accepts a guest token for anonymous users). */
export default function WishlistButton({ productId, className = 'pcard-fav' }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(readLocal().includes(String(productId)));
  }, [productId]);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const id = String(productId);
    const ids = readLocal();
    const next = !active;
    setActive(next);
    if (next) {
      writeLocal([...new Set([...ids, id])]);
      try { await addToWishlist(productId); } catch {}
    } else {
      writeLocal(ids.filter((x) => x !== id));
      try { await removeFromWishlist(productId); } catch {}
    }
    window.dispatchEvent(new Event('morbix-wishlist-change'));
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
