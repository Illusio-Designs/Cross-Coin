// Wishlist store for the /test preview. Local + localStorage (like the cart) so
// it works without login — the live wishlist API needs an account, which the
// preview intentionally doesn't have. PREVIEW ONLY — per-browser, not synced.
import { useSyncExternalStore } from 'react';

const KEY = 'cc_test_wishlist_v1';
let list = []; // [{ id, slug, name, brand, now, was, off, img, rating, revs, colors, sizes, variants }]
let hydrated = false;
const subs = new Set();

function emit() {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) {}
  subs.forEach((fn) => fn());
}
function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try { const raw = localStorage.getItem(KEY); if (raw) list = JSON.parse(raw) || []; } catch (_) {}
}

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function getWishlist() { hydrate(); return list; }

const EMPTY = [];
export function useWishlist() {
  return useSyncExternalStore(subscribe, getWishlist, () => EMPTY);
}

export const wishCount = (l = list) => l.length;
export const isWished = (id) => { hydrate(); return list.some((p) => String(p.id) === String(id)); };

// Keep only the fields ProductCard renders (avoids storing the heavy raw record).
function trim(p) {
  return {
    id: p.id, slug: p.slug, name: p.name, brand: p.brand,
    now: p.now, was: p.was, off: p.off, img: p.img,
    rating: p.rating, revs: p.revs, colors: p.colors, sizes: p.sizes, variants: p.variants,
  };
}

// Returns true if the item is now wished, false if it was removed.
export function toggleWish(p) {
  hydrate();
  if (!p || p.id == null) return false;
  if (list.some((x) => String(x.id) === String(p.id))) {
    list = list.filter((x) => String(x.id) !== String(p.id));
    emit();
    return false;
  }
  list = [...list, trim(p)];
  emit();
  return true;
}

export function removeWish(id) { hydrate(); list = list.filter((p) => String(p.id) !== String(id)); emit(); }
export function clearWishlist() { hydrate(); list = []; emit(); }
