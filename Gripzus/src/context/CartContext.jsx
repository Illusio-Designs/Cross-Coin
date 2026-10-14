import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart,
} from '../services/cart';
import { toastAddedToCart, toastRemovedFromCart, toastCartCleared } from '../utils/toast';
import { fbTrack } from '../utils/pixel';

/* Gripzus cart — backend-synced (same model as Knitwink).

   - Signed-in shoppers: every cart action hits the backend cart API.
   - Guests: the cart lives in localStorage.
   - On first login the guest cart is merged into the backend cart.

   The public interface is unchanged, so the slide-in drawer and every
   add-to-bag button keep working as-is. */

const CartContext = createContext(null);
const STORAGE_KEY = 'gripzus:cart';

function isAuthed() {
  if (typeof window === 'undefined') return false;
  try { return !!localStorage.getItem('token'); } catch { return false; }
}

/* A cart line is uniquely keyed by product id + size + colour + pack group.
   The packId suffix keeps each per-colour line of a multi-pair pack distinct and
   stops a pack pair from collapsing into a matching loose line (packId is '' for
   ordinary lines, so existing non-pack behaviour is unchanged). */
const lineKey = (it) => `${it.id}::${it.size || ''}::${it.color || ''}::${it.packId || ''}`;

/* Backend cart row → Gripzus cart-line shape. */
function normalizeApiItem(row) {
  const p = row.Product || row.product || {};
  const productId = String(row.productId ?? row.product_id ?? p.id ?? row.id ?? '');
  // Prefer the product's FIRST image (matches the listing card) over the
  // backend's colour-matched `row.image`.
  const firstOf = (arr) => {
    const x = arr?.[0];
    if (!x) return '';
    return typeof x === 'string' ? x : (x.image_url || x.url || x.large || '');
  };
  const image =
    firstOf(row.images) ||
    firstOf(p.images) ||
    firstOf(p.ProductImages) ||
    row.image ||
    '';
  return {
    id:          productId,
    variationId: row.variationId ?? row.variation_id ?? null,
    name:        row.name || p.name || '',
    slug:        row.slug || p.slug || p.handle || productId,
    image,
    price:       Number(row.price ?? p.price ?? 0),
    salePrice:   undefined,
    collection:  p.category?.name || p.Category?.name || row.collection || '',
    size:        Array.isArray(row.size) ? row.size[0] : (row.size || ''),
    color:       Array.isArray(row.color) ? row.color.join(', ') : (row.color || ''),
    qty:         Number(row.quantity ?? row.qty ?? 1),
    // Pack group identifiers (null for ordinary lines).
    packId:      row.packId ?? row.pack_id ?? null,
    packSize:    row.packSize ?? row.pack_size ?? null,
  };
}

export function CartProvider({ children }) {
  const [items, setItems]     = useState([]);
  const [open, setOpen]       = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  const pendingRef  = useRef(false);  // guards against overlapping loads
  const wasAuthedRef = useRef(false); // tracks the guest → signed-in transition

  /* Load the cart: backend if signed in, localStorage if guest.
     On the first transition to signed-in, merge the guest cart up. */
  const loadCart = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setLoading(true);
    const authed = isAuthed();
    try {
      if (authed) {
        if (!wasAuthedRef.current) {
          let guest = [];
          try { guest = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch {}
          for (const g of guest) {
            try {
              await apiAddToCart({
                productId: Number(g.id),
                variationId: g.variationId || null,
                quantity: g.qty || 1,
                size: g.size || null,
                color: g.color || null,
                pack_id: g.packId || null,
                pack_size: g.packSize || null,
              });
            } catch { /* non-fatal */ }
          }
          if (guest.length) { try { localStorage.removeItem(STORAGE_KEY); } catch {} }
        }
        const data = await apiGetCart();
        setItems(Array.isArray(data) ? data.map(normalizeApiItem) : []);
      } else {
        let guest = [];
        try { guest = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch {}
        setItems(Array.isArray(guest) ? guest : []);
      }
    } catch {
      // Backend unreachable — fall back to whatever is in localStorage.
      try { setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
      catch { setItems([]); }
    } finally {
      wasAuthedRef.current = authed;
      setLoading(false);
      setHydrated(true);
      pendingRef.current = false;
    }
  }, []);

  useEffect(() => { loadCart(); }, [loadCart]);

  // Re-sync when auth changes in another tab (login / logout).
  useEffect(() => {
    const onStorage = (e) => {
      if (!e || e.key === 'token' || e.key === null) loadCart();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadCart]);

  // Persist the guest cart to localStorage (signed-in carts live on the server).
  useEffect(() => {
    if (!hydrated || loading || isAuthed()) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, hydrated, loading]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const addItem = useCallback(async (item, { openDrawer = true, toast = true } = {}) => {
    if (!item?.id) return;

    // Meta funnel: AddToCart (browser pixel + server CAPI, deduped by eventID).
    const qty = item.qty || 1;
    const unitPrice = Number(item.salePrice ?? item.price ?? 0);
    fbTrack('AddToCart', {
      content_ids: [String(item.id)],
      content_type: 'product',
      content_name: item.name || undefined,
      value: unitPrice * qty,
      currency: 'INR',
      contents: [{ id: String(item.id), quantity: qty }],
    });

    if (isAuthed()) {
      try {
        await apiAddToCart({
          productId: Number(item.id),
          variationId: item.variationId || null,
          quantity: item.qty || 1,
          size: item.size || null,
          color: item.color || null,
          // Optional pack identifiers — null for ordinary / single-colour-pack
          // lines, so the server reprices by plain quantity exactly as before.
          pack_id: item.packId || null,
          pack_size: item.packSize || null,
        });
        const data = await apiGetCart();
        const rows = Array.isArray(data) ? data.map(normalizeApiItem) : [];
        // Keep the SELECTED variation's first image (the colour the shopper
        // clicked) on the line we just added — the backend can return a generic
        // or mismatched image for the row.
        if (item.image) {
          const sameLine = (r) =>
            String(r.id) === String(item.id) &&
            String(r.size || '') === String(item.size || '') &&
            String(r.color || '') === String(item.color || '');
          rows.forEach((r) => { if (sameLine(r)) r.image = item.image; });
        }
        setItems(rows);
        if (toast) toastAddedToCart(item.name);
        if (openDrawer) setOpen(true);
        return;
      } catch {
        // fall through to a local add so the shopper isn't blocked
      }
    }

    // Guest add (or backend failed) — merge into the localStorage cart.
    setItems((prev) => {
      const key = lineKey(item);
      const found = prev.find((p) => lineKey(p) === key);
      if (found) {
        return prev.map((p) =>
          lineKey(p) === key ? { ...p, qty: p.qty + (item.qty || 1) } : p
        );
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });
    if (toast) toastAddedToCart(item.name);
    if (openDrawer) setOpen(true);
  }, []);

  /* Add a multi-pair pack whose pairs can be different colours. Each distinct
     colour becomes its own cart line, all sharing one packId, every line priced
     at the pack's per-pair rate. The server re-prices the whole pack group from
     the bundle tier (by the group's TOTAL quantity) at cart/checkout/order time,
     so the `packUnit` passed here is only used for the guest localStorage line +
     the Meta pixel — pricing stays server-authoritative.
     perPair: [{ variationId, color, image }] — one entry per pair in the pack. */
  const addPack = useCallback(async (product, size = '', perPair = [], packUnit = 0, packSize = 0, { openDrawer = true, toast = true } = {}) => {
    if (!product?.id || !perPair.length) return;
    // A stable, unique group id per add so each pack add is its own tier group.
    const packId = `${product.id}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    // Meta funnel: AddToCart for the whole pack.
    fbTrack('AddToCart', {
      content_ids: [String(product.id)],
      content_type: 'product',
      content_name: product.name || undefined,
      value: Number(packUnit) * perPair.length,
      currency: 'INR',
      contents: [{ id: String(product.id), quantity: perPair.length }],
    });

    // Merge pairs of the same colour/variation into one line with a quantity.
    const byVar = new Map();
    for (const p of perPair) {
      const vid = p.variationId ?? null;
      const k = String(vid ?? `${p.color || ''}-${size || ''}`);
      const cur = byVar.get(k) || { variationId: vid, color: p.color || null, image: p.image || null, qty: 0 };
      cur.qty += 1;
      byVar.set(k, cur);
    }
    const lines = [...byVar.values()];

    if (isAuthed()) {
      try {
        for (const ln of lines) {
          await apiAddToCart({
            productId: Number(product.id),
            variationId: ln.variationId || null,
            quantity: ln.qty,
            size: size || null,
            color: ln.color || null,
            pack_id: packId,
            pack_size: packSize,
          });
        }
        const data = await apiGetCart();
        let rows = Array.isArray(data) ? data.map(normalizeApiItem) : [];
        // Keep each per-colour line's chosen image (the backend may return a
        // generic row image) for the pack we just added.
        rows = rows.map((r) => {
          if (String(r.packId || '') !== String(packId)) return r;
          const ln = lines.find((l) =>
            String(l.color || '') === String(r.color || '') &&
            String(l.variationId ?? '') === String(r.variationId ?? ''));
          return ln && ln.image ? { ...r, image: ln.image } : r;
        });
        setItems(rows);
        if (toast) toastAddedToCart(product.name);
        if (openDrawer) setOpen(true);
        return;
      } catch {
        // fall through to a guest add so the shopper isn't blocked
      }
    }

    // Guest add — append one line per colour (packId is unique, so no collision
    // with existing lines).
    setItems((prev) => [
      ...prev,
      ...lines.map((ln) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        image: ln.image || product.image || null,
        price: Number(packUnit),
        collection: product.collection,
        size,
        color: ln.color || null,
        qty: ln.qty,
        variationId: ln.variationId || null,
        packId,
        packSize,
      })),
    ]);
    if (toast) toastAddedToCart(product.name);
    if (openDrawer) setOpen(true);
  }, []);

  const removeItem = useCallback(async (key) => {
    const it = items.find((p) => lineKey(p) === key);
    if (!it) return;

    if (isAuthed()) {
      // Try the exact variation first; if that 404s (legacy items were stored
      // with a null variationId but the API reports a resolved default id), retry
      // matching by product only so the row is actually deleted server-side.
      let ok = false;
      try { await apiRemoveFromCart(it.id, it.variationId ?? null); ok = true; } catch { /* retry below */ }
      if (!ok && it.variationId != null) { try { await apiRemoveFromCart(it.id, null); ok = true; } catch { /* ignore */ } }
      try {
        const data = await apiGetCart();
        setItems(Array.isArray(data) ? data.map(normalizeApiItem) : []);
      } catch {
        setItems((prev) => prev.filter((p) => lineKey(p) !== key));
      }
      toastRemovedFromCart(it.name);
      return;
    }

    setItems((prev) => prev.filter((p) => lineKey(p) !== key));
    toastRemovedFromCart(it.name);
  }, [items]);

  const updateQty = useCallback(async (key, qty) => {
    const it = items.find((p) => lineKey(p) === key);
    if (!it) return;
    if (qty <= 0) { removeItem(key); return; }

    if (isAuthed()) {
      try {
        await apiUpdateCartItem(it.id, qty, it.variationId ?? null);
        const data = await apiGetCart();
        setItems(Array.isArray(data) ? data.map(normalizeApiItem) : []);
        return;
      } catch { /* fall through to local update */ }
    }

    setItems((prev) => prev.map((p) => (lineKey(p) === key ? { ...p, qty } : p)));
  }, [items, removeItem]);

  const clearCart = useCallback(async () => {
    if (isAuthed()) {
      try { await apiClearCart(); } catch { /* non-fatal */ }
    }
    setItems([]);
    toastCartCleared();
  }, []);

  const count    = items.reduce((s, it) => s + it.qty, 0);
  const subtotal = items.reduce((s, it) => s + (it.salePrice ?? it.price) * it.qty, 0);

  const value = {
    items, count, subtotal, lineKey, loading,
    open, openCart: () => setOpen(true), closeCart: () => setOpen(false),
    addItem, addPack, removeItem, updateQty, clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
