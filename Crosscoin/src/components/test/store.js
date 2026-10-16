// Tiny cart store for the /test design preview. Module-level + localStorage so
// state survives client-side navigation between /test, /test/shop, /test/product
// and /test/cart (each route mounts its own TestLayout, so a plain React context
// would reset on nav — this persists instead). PREVIEW ONLY — not the real cart.
import { useSyncExternalStore } from 'react';

const KEY = 'cc_test_cart_v1';
let cart = [];       // [{ key, id, name, brand, color, size, pack, packq, unit, qty }]
let hydrated = false;
const subs = new Set();

function emit() {
  try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (_) {}
  subs.forEach((fn) => fn());
}
function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try { const raw = localStorage.getItem(KEY); if (raw) cart = JSON.parse(raw) || []; } catch (_) {}
}

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function getCart() { hydrate(); return cart; }

// React hook — re-renders on cart change. Server snapshot is an empty array so
// SSR and the first client render agree (avoids hydration mismatch); the real
// cart is read right after mount.
const EMPTY = [];
export function useCart() {
  return useSyncExternalStore(subscribe, getCart, () => EMPTY);
}

export const cartCount = (c = cart) => c.reduce((n, i) => n + i.qty, 0);
export const cartSubtotal = (c = cart) => c.reduce((s, i) => s + i.unit * i.qty, 0);

export function addItem({ id, name, brand, color, size, pack, packq, unit, img }, qty = 1) {
  hydrate();
  const key = [id, color, size, packq].join('|');
  const ex = cart.find((i) => i.key === key);
  if (ex) ex.qty += qty;
  else cart = [...cart, { key, id, name, brand, color, size, pack, packq, unit, img: img || '', qty }];
  emit();
}
export function removeItem(key) { hydrate(); cart = cart.filter((i) => i.key !== key); emit(); }
export function changeQty(key, delta) {
  hydrate();
  const i = cart.find((x) => x.key === key);
  if (!i) return;
  i.qty += delta;
  if (i.qty <= 0) cart = cart.filter((x) => x.key !== key);
  else cart = [...cart];
  emit();
}
export function clearCart() { hydrate(); cart = []; emit(); }
