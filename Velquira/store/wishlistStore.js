import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getWishlist as apiGetWishlist,
  addToWishlist as apiAddToWishlist,
  removeFromWishlist as apiRemoveFromWishlist,
  clearWishlist as apiClearWishlist,
} from '@/lib/api/wishlist';
import {
  toastAddedToWishlist,
  toastRemovedFromWishlist,
} from '@/lib/toast';

/* Wishlist store — backend-synced.

   The store keeps the rich product object locally (so UI cards have
   access to images, variants, colors, handle) and uses the backend
   only as the source-of-truth for *which IDs* the user has saved.

   Flow:
     - hydrate()  → fetches IDs from backend, drops any local items
                    not in that list. Called once at app mount via the
                    WishlistHydrator component.
     - addItem()  → optimistic insert + POST to backend (rolled back on
                    failure)
     - removeItem / toggle / clear → optimistic + sync, same pattern */

const persistedKey = 'velquira-wishlist';

export const useWishlistStore = create()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      syncing: false,

      hasItem: (productId) =>
        get().items.some((i) => String(i.id) === String(productId)),

      /* Pull the source-of-truth list from the backend. We keep any
         local item whose id is also in the backend list (so UI cards
         keep their richer data) and replace with backend rows for
         anything we haven't seen locally. */
      hydrate: async () => {
        try {
          const remote = await apiGetWishlist();
          const remoteIds = new Set(remote.map((r) => String(r.id)));

          const localById = new Map(
            get().items.map((i) => [String(i.id), i])
          );

          const merged = remote.map((r) => {
            const local = localById.get(String(r.id));
            // Local copy is richer — prefer it, but make sure the id is
            // a string and the handle/price stay synced with backend.
            if (local) {
              return {
                ...local,
                id: String(r.id),
                price: r.price ?? local.price,
                handle: r.handle || local.handle,
              };
            }
            return r;
          });

          // Drop any local items the backend doesn't know about
          // (e.g. items added before signing in on a different device).
          const final = merged.filter((i) => remoteIds.has(String(i.id)));

          set({ items: final, hydrated: true });
        } catch {
          // Network/auth failure — keep whatever's in localStorage.
          set({ hydrated: true });
        }
      },

      addItem: async (product) => {
        if (!product?.id) return;
        const id = String(product.id);
        if (get().hasItem(id)) return;

        const optimistic = { ...product, id };
        const prev = get().items;
        set({ items: [...prev, optimistic], syncing: true });

        try {
          await apiAddToWishlist(id);
          toastAddedToWishlist(product.name);
        } catch {
          // Roll back on failure.
          set({ items: prev });
        } finally {
          set({ syncing: false });
        }
      },

      removeItem: async (productId) => {
        const id = String(productId);
        const prev = get().items;
        const removed = prev.find((i) => String(i.id) === id);
        if (!removed) return;
        set({ items: prev.filter((i) => String(i.id) !== id), syncing: true });

        try {
          await apiRemoveFromWishlist(id);
          toastRemovedFromWishlist(removed.name);
        } catch {
          set({ items: prev });
        } finally {
          set({ syncing: false });
        }
      },

      /* Patch a stored wishlist row in place — used to keep the saved
         variation (selectedColor, selectedVariantId, selectedImageUrl)
         in sync when the user changes their selection on the product
         page. Local-only; no backend call (the backend stores by
         productId only — variation pick is a UI preference). */
      updateItem: (productId, patch) => {
        const id = String(productId);
        set((state) => ({
          items: state.items.map((i) =>
            String(i.id) === id ? { ...i, ...patch } : i
          ),
        }));
      },

      toggle: (product) => {
        const id = String(product.id);
        if (get().hasItem(id)) {
          get().removeItem(id);
        } else {
          get().addItem(product);
        }
      },

      clear: async () => {
        const prev = get().items;
        set({ items: [], syncing: true });
        try {
          await apiClearWishlist();
        } catch {
          set({ items: prev });
        } finally {
          set({ syncing: false });
        }
      },
    }),
    {
      name: persistedKey,
      // Don't persist transient flags — only the items survive reloads.
      partialize: (state) => ({ items: state.items }),
    }
  )
);
