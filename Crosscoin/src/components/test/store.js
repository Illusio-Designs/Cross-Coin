// Tiny cart store for the /test design preview. Module-level + localStorage so
// state survives client-side navigation between /test, /test/shop, /test/product
// and the drawer (each route mounts its own TestLayout, so a plain React context
// would reset on nav — this persists instead). PREVIEW ONLY — not the real cart.
import { useSyncExternalStore } from 'react';
import { fbqTrack } from '@/utils/fbqTrack';

// Meta Pixel + CAPI AddToCart (also GA4 + first-party funnel). Fired from the
// add helpers so every add path (PDP, quick-add, buy-more-save-more) is covered.
function fireAddToCart({ id, name, unit, qty }) {
  try {
    fbqTrack('AddToCart', {
      content_ids: [String(id)], content_type: 'product', content_name: name || '',
      contents: [{ id: String(id), quantity: qty || 1 }],
      value: Number(unit || 0) * (qty || 1), currency: 'INR',
    });
  } catch (_) { /* analytics never blocks the cart */ }
}

const KEY = 'cc_test_cart_v1';
// Line: { key, id, vid, name, brand, color, size, pack, packq, unit, was, base,
//         img, qty, packId, packSize }
// packId groups several same-product colour lines into ONE bundle pack (Morbix
// model); packSize is the total pairs in that pack. Both null for a plain line.
let cart = [];
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

const EMPTY = [];
export function useCart() {
  return useSyncExternalStore(subscribe, getCart, () => EMPTY);
}

export const cartCount = (c = cart) => c.reduce((n, i) => n + i.qty, 0);
export const cartSubtotal = (c = cart) => c.reduce((s, i) => s + i.unit * i.qty, 0);

const uid = () => 'pk_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 7);

export function addItem({ id, vid, name, brand, color, size, pack, packq, unit, was, base, img, packId, packSize }, qty = 1) {
  hydrate();
  const key = [id, vid || '', color, size, packq, packId || ''].join('|');
  const ex = cart.find((i) => i.key === key);
  if (ex) ex.qty += qty;
  else cart = [...cart, { key, id, vid: vid || null, name, brand, color, size, pack, packq, unit, was: was || 0, base: base || unit, img: img || '', qty, packId: packId || null, packSize: packSize || null }];
  emit();
  fireAddToCart({ id, name, unit, qty });
}

// Add a multi-pair pack as one bundle group: mint a packId and create one line
// per chosen colour (merging duplicate colours), each priced at the per-pair
// rate, all sharing the packId + packSize. This is how Crosscoin/Morbix move a
// mixed-colour pack — the backend reprices the whole group by pack_id at checkout.
export function addPack({ id, vid, name, brand, size, img, perPair, was, base, packSize, colors }) {
  hydrate();
  const packId = uid();
  const counts = new Map();
  (colors && colors.length ? colors : ['']).forEach((c) => counts.set(c || '', (counts.get(c || '') || 0) + 1));
  const lines = [];
  counts.forEach((qty, color) => {
    lines.push({
      key: [id, vid || '', color, size, 1, packId].join('|'),
      id, vid: vid || null, name, brand, color, size,
      pack: `${packSize} Pairs`, packq: 1, unit: perPair, was: was || 0, base: base || perPair,
      img: img || '', qty, packId, packSize,
    });
  });
  cart = [...cart, ...lines];
  emit();
  fireAddToCart({ id, name, unit: perPair, qty: packSize });
}

// Group the cart for display: plain lines pass through; lines sharing a packId
// collapse into one { type:'pack' } entry so the drawer can show the bundle as a
// unit. Preserves first-seen order.
export function cartGroups(c = cart) {
  const out = [];
  const seen = new Map(); // packId -> index in out
  c.forEach((i) => {
    if (i.packId) {
      if (seen.has(i.packId)) { out[seen.get(i.packId)].lines.push(i); }
      else { seen.set(i.packId, out.length); out.push({ type: 'pack', packId: i.packId, lines: [i] }); }
    } else {
      out.push({ type: 'single', item: i });
    }
  });
  return out.map((g) => {
    if (g.type !== 'pack') return g;
    const pairs = g.lines.reduce((s, l) => s + l.qty, 0);
    const total = g.lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const f = g.lines[0];
    return { ...g, pairs, total, perPair: f.unit, name: f.name, brand: f.brand, img: f.img, packSize: f.packSize, size: f.size };
  });
}

// Change a whole pack group to a bundle tier (in-cart): reprice every colour
// line at the tier's per-pair rate and nudge the largest line so the group's
// total pairs lands on the tier. Mirrors Morbix's group stepper.
export function setPackTier(packId, tierPairs, tierTotal) {
  hydrate();
  const lines = cart.filter((i) => i.packId === packId);
  if (!lines.length || !tierPairs) return;
  const perPair = Math.round(tierTotal / tierPairs);
  const curTotal = lines.reduce((s, l) => s + l.qty, 0);
  const anchor = lines.reduce((a, b) => (b.qty > a.qty ? b : a));
  const others = curTotal - anchor.qty;
  const newAnchorQty = Math.max(1, tierPairs - others);
  cart = cart.map((i) => {
    if (i.packId !== packId) return i;
    return { ...i, qty: i.key === anchor.key ? newAnchorQty : i.qty, unit: perPair, packSize: tierPairs, pack: `${tierPairs} Pairs` };
  });
  emit();
}

// Reprice a line to a bundle tier (Buy More, Save More in the cart).
export function setLinePack(key, { qty, unit, pack, packq }) {
  hydrate();
  const i = cart.find((x) => x.key === key);
  if (!i) return;
  if (qty != null) i.qty = Math.max(1, qty);
  if (unit != null) i.unit = unit;
  if (pack != null) i.pack = pack;
  if (packq != null) i.packq = packq;
  cart = [...cart];
  emit();
}
// WhatsApp cart-recovery link: put a recovered cart back (lines from
// GET /api/abandoned-cart/restore/:token — see utils/cartRecovery.js). The link
// usually opens in WhatsApp's in-app browser, which has none of this shopper's
// localStorage, so the cart is rebuilt from the server copy. Only fills an
// EMPTY cart; no AddToCart pixel (the shopper isn't adding anything new).
export function restoreCart(lines) {
  hydrate();
  if (cart.length) return 0;
  const list = (Array.isArray(lines) ? lines : []).map((l) => {
    if (l.line && l.line.key && l.line.id != null) return { ...l.line, qty: l.quantity || 1 };
    const price = Number(l.price) || 0;
    const color = l.color || '';
    const size = l.size || '';
    return {
      key: [l.productId, l.variationId || '', color, size, 1, l.packId || ''].join('|'),
      id: l.productId, vid: l.variationId || null, name: l.name || '', brand: '',
      color, size, pack: l.packSize ? `${l.packSize} Pairs` : 'Single', packq: 1,
      unit: price, was: Number(l.comparePrice) || 0, base: price, img: l.image || '',
      qty: l.quantity || 1, packId: l.packId || null, packSize: l.packSize || null,
    };
  }).filter((i) => i.id != null);
  if (!list.length) return 0;
  cart = list;
  emit();
  return list.length;
}

export function removeItem(key) { hydrate(); cart = cart.filter((i) => i.key !== key); emit(); }
// Remove every line of a pack group at once.
export function removePack(packId) { hydrate(); cart = cart.filter((i) => i.packId !== packId); emit(); }
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
