'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { addToWishlist, removeFromWishlist } from '@/lib/api/wishlist';

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
      <Icon name="Heart" size={15} color={active ? 'var(--sale)' : undefined} />
    </button>
  );
}
